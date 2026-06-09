const { shell } = require('electron')
const { nextYearlyCode, paginate } = require('./helpers.cjs')
const { generateInvoicePdf } = require('../pdf/documents.cjs')

function recalcInvoice(db, invoiceId) {
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId)
  const subtotal = items.reduce((sum, i) => sum + i.total, 0)
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId)
  const total = Math.max(0, subtotal - invoice.discount + invoice.tax)
  const paid = db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE invoice_id = ?').get(invoiceId).s
  const due = Math.max(0, total - paid)
  const status = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
  db.prepare(`
    UPDATE invoices SET subtotal = ?, total = ?, paid_amount = ?, due_amount = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(subtotal, total, paid, due, status, invoiceId)
}

function register(ipcMain, db) {
  const withPatient = `
    SELECT i.*, p.full_name AS patient_name, p.phone AS patient_phone, p.patient_code
    FROM invoices i JOIN patients p ON p.id = i.patient_id
  `

  ipcMain.handle('billing:list', (_evt, params = {}) => {
    const { page, pageSize, offset } = paginate(params)
    const conditions = []
    const args = []
    if (params.search) {
      conditions.push('(i.invoice_no LIKE ? OR p.full_name LIKE ? OR p.phone LIKE ?)')
      const like = `%${params.search}%`
      args.push(like, like, like)
    }
    if (params.status) {
      conditions.push('i.status = ?')
      args.push(params.status)
    }
    if (params.from && params.to) {
      conditions.push('i.invoice_date BETWEEN ? AND ?')
      args.push(params.from, params.to)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const total = db.prepare(`SELECT COUNT(*) AS n FROM invoices i JOIN patients p ON p.id = i.patient_id ${where}`).get(...args).n
    const rows = db.prepare(`${withPatient} ${where} ORDER BY i.invoice_date DESC, i.id DESC LIMIT ? OFFSET ?`).all(...args, pageSize, offset)
    return { rows, total, page, pageSize }
  })

  ipcMain.handle('billing:get', (_evt, id) => {
    const invoice = db.prepare(`${withPatient} WHERE i.id = ?`).get(id)
    if (!invoice) return null
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id)
    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at ASC').all(id)
    return { invoice, items, payments }
  })

  ipcMain.handle('billing:create', (_evt, data) => {
    const invoiceNo = nextYearlyCode(db, { table: 'invoices', column: 'invoice_no', prefix: 'INV', pad: 5 })
    const tx = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO invoices (invoice_no, patient_id, appointment_id, visit_id, invoice_date, discount, tax, notes, created_by)
        VALUES (@invoice_no, @patient_id, @appointment_id, @visit_id, @invoice_date, @discount, @tax, @notes, @created_by)
      `).run({
        invoice_no: invoiceNo,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id || null,
        visit_id: data.visit_id || null,
        invoice_date: data.invoice_date || new Date().toISOString().slice(0, 10),
        discount: Number(data.discount || 0),
        tax: Number(data.tax || 0),
        notes: data.notes || null,
        created_by: data.created_by || null,
      })
      const invoiceId = info.lastInsertRowid
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
      `)
      ;(data.items || []).forEach((item) => {
        const qty = Number(item.quantity || 1)
        const price = Number(item.unit_price || 0)
        insertItem.run(invoiceId, item.description, qty, price, qty * price)
      })
      if (data.paid_amount && Number(data.paid_amount) > 0) {
        db.prepare(`INSERT INTO payments (invoice_id, amount, mode, reference, recorded_by) VALUES (?, ?, ?, ?, ?)`)
          .run(invoiceId, Number(data.paid_amount), data.payment_mode || 'cash', data.payment_reference || null, data.created_by || null)
      }
      recalcInvoice(db, invoiceId)
      return invoiceId
    })
    const invoiceId = tx()
    return db.prepare(`${withPatient} WHERE i.id = ?`).get(invoiceId)
  })

  ipcMain.handle('billing:update', (_evt, data) => {
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE invoices SET discount = @discount, tax = @tax, notes = @notes, updated_at = datetime('now')
        WHERE id = @id
      `).run({ id: data.id, discount: Number(data.discount || 0), tax: Number(data.tax || 0), notes: data.notes || null })

      if (Array.isArray(data.items)) {
        db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(data.id)
        const insertItem = db.prepare(`
          INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
          VALUES (?, ?, ?, ?, ?)
        `)
        data.items.forEach((item) => {
          const qty = Number(item.quantity || 1)
          const price = Number(item.unit_price || 0)
          insertItem.run(data.id, item.description, qty, price, qty * price)
        })
      }
      recalcInvoice(db, data.id)
    })
    tx()
    return db.prepare(`${withPatient} WHERE i.id = ?`).get(data.id)
  })

  ipcMain.handle('billing:recordPayment', (_evt, data) => {
    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO payments (invoice_id, amount, mode, reference, recorded_by) VALUES (?, ?, ?, ?, ?)`)
        .run(data.invoice_id, Number(data.amount), data.mode || 'cash', data.reference || null, data.recorded_by || null)
      recalcInvoice(db, data.invoice_id)
    })
    tx()
    return db.prepare(`${withPatient} WHERE i.id = ?`).get(data.invoice_id)
  })

  ipcMain.handle('billing:remove', (_evt, id) => {
    db.prepare(`UPDATE invoices SET status = 'void', updated_at = datetime('now') WHERE id = ?`).run(id)
    return { ok: true }
  })

  ipcMain.handle('billing:dailySummary', (_evt, date) => {
    const day = date || new Date().toISOString().slice(0, 10)
    const invoiceTotals = db.prepare(`
      SELECT COUNT(*) AS invoice_count, COALESCE(SUM(total),0) AS billed, COALESCE(SUM(paid_amount),0) AS collected,
             COALESCE(SUM(due_amount),0) AS outstanding
      FROM invoices WHERE invoice_date = ? AND status != 'void'
    `).get(day)
    const byMode = db.prepare(`
      SELECT mode, COALESCE(SUM(amount),0) AS amount, COUNT(*) AS count
      FROM payments WHERE date(paid_at) = ? GROUP BY mode
    `).all(day)
    const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM expenses WHERE expense_date = ?`).get(day).s
    return { date: day, ...invoiceTotals, byMode, expenses, netCash: invoiceTotals.collected - expenses }
  })

  ipcMain.handle('billing:generatePdf', async (_evt, id) => {
    const filePath = await generateInvoicePdf(db, id)
    await shell.openPath(filePath)
    return { filePath }
  })
}

module.exports = { register }
