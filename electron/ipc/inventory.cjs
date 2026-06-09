const { nextSequenceCode } = require('./helpers.cjs')

function register(ipcMain, db) {
  ipcMain.handle('inventory:list', (_evt, params = {}) => {
    const conditions = []
    const args = []
    if (params.search) {
      conditions.push('(i.name LIKE ? OR i.category LIKE ?)')
      const like = `%${params.search}%`
      args.push(like, like)
    }
    if (params.lowStockOnly) conditions.push('i.quantity <= i.reorder_level')
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return db.prepare(`
      SELECT i.*, s.name AS supplier_name
      FROM inventory_items i LEFT JOIN suppliers s ON s.id = i.supplier_id
      ${where} ORDER BY i.name ASC
    `).all(...args)
  })

  ipcMain.handle('inventory:lowStock', () => {
    return db.prepare(`
      SELECT i.*, s.name AS supplier_name
      FROM inventory_items i LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.quantity <= i.reorder_level ORDER BY (i.quantity - i.reorder_level) ASC
    `).all()
  })

  ipcMain.handle('inventory:create', (_evt, data) => {
    const info = db.prepare(`
      INSERT INTO inventory_items (name, category, unit, quantity, reorder_level, unit_price, supplier_id, expiry_date, notes)
      VALUES (@name, @category, @unit, @quantity, @reorder_level, @unit_price, @supplier_id, @expiry_date, @notes)
    `).run({
      name: data.name,
      category: data.category || null,
      unit: data.unit || 'pcs',
      quantity: Number(data.quantity || 0),
      reorder_level: Number(data.reorder_level || 10),
      unit_price: Number(data.unit_price || 0),
      supplier_id: data.supplier_id || null,
      expiry_date: data.expiry_date || null,
      notes: data.notes || null,
    })
    if (Number(data.quantity || 0) > 0) {
      db.prepare(`INSERT INTO stock_movements (item_id, movement_type, quantity, reason) VALUES (?, 'in', ?, 'Initial stock')`)
        .run(info.lastInsertRowid, Number(data.quantity))
    }
    return db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(info.lastInsertRowid)
  })

  ipcMain.handle('inventory:update', (_evt, data) => {
    db.prepare(`
      UPDATE inventory_items SET
        name = @name, category = @category, unit = @unit, reorder_level = @reorder_level,
        unit_price = @unit_price, supplier_id = @supplier_id, expiry_date = @expiry_date,
        notes = @notes, updated_at = datetime('now')
      WHERE id = @id
    `).run({
      id: data.id,
      name: data.name,
      category: data.category || null,
      unit: data.unit || 'pcs',
      reorder_level: Number(data.reorder_level || 10),
      unit_price: Number(data.unit_price || 0),
      supplier_id: data.supplier_id || null,
      expiry_date: data.expiry_date || null,
      notes: data.notes || null,
    })
    return db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(data.id)
  })

  ipcMain.handle('inventory:remove', (_evt, id) => {
    db.prepare('DELETE FROM inventory_items WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('inventory:adjustStock', (_evt, data) => {
    const tx = db.transaction(() => {
      const delta = data.movement_type === 'out' ? -Math.abs(Number(data.quantity)) : Math.abs(Number(data.quantity))
      db.prepare(`UPDATE inventory_items SET quantity = MAX(0, quantity + ?), updated_at = datetime('now') WHERE id = ?`)
        .run(delta, data.item_id)
      db.prepare(`
        INSERT INTO stock_movements (item_id, movement_type, quantity, reason, reference, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.item_id, data.movement_type, Math.abs(Number(data.quantity)), data.reason || null, data.reference || null, data.recorded_by || null)
    })
    tx()
    return db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(data.item_id)
  })

  ipcMain.handle('inventory:suppliers', () => db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all())

  ipcMain.handle('inventory:createSupplier', (_evt, data) => {
    const info = db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, email, address, notes)
      VALUES (@name, @contact_person, @phone, @email, @address, @notes)
    `).run({
      name: data.name,
      contact_person: data.contact_person || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      notes: data.notes || null,
    })
    return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid)
  })

  ipcMain.handle('inventory:purchaseOrders', () => {
    return db.prepare(`
      SELECT po.*, s.name AS supplier_name
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id
      ORDER BY po.order_date DESC, po.id DESC
    `).all()
  })

  ipcMain.handle('inventory:createPurchaseOrder', (_evt, data) => {
    const poNo = nextSequenceCode(db, { table: 'purchase_orders', column: 'po_no', prefix: 'PO', pad: 5 })
    const tx = db.transaction(() => {
      const items = data.items || []
      const total = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0)
      const info = db.prepare(`
        INSERT INTO purchase_orders (po_no, supplier_id, order_date, status, total_amount, notes)
        VALUES (?, ?, ?, 'pending', ?, ?)
      `).run(poNo, data.supplier_id || null, data.order_date || new Date().toISOString().slice(0, 10), total, data.notes || null)
      const poId = info.lastInsertRowid
      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (po_id, item_id, item_name, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      items.forEach((item) => {
        const qty = Number(item.quantity || 0)
        const price = Number(item.unit_price || 0)
        insertItem.run(poId, item.item_id || null, item.item_name, qty, price, qty * price)
      })
      return poId
    })
    const id = tx()
    return db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id)
  })
}

module.exports = { register }
