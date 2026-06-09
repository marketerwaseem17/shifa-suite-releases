const { shell } = require('electron')
const { nextYearlyCode } = require('./helpers.cjs')
const { generatePrescriptionPdf } = require('../pdf/documents.cjs')

function register(ipcMain, db) {
  const withDetails = `
    SELECT pr.*, p.full_name AS patient_name, p.patient_code, u.full_name AS doctor_name
    FROM prescriptions pr
    JOIN patients p ON p.id = pr.patient_id
    LEFT JOIN users u ON u.id = pr.doctor_id
  `

  ipcMain.handle('prescriptions:list', (_evt, params = {}) => {
    const conditions = []
    const args = []
    if (params.patientId) {
      conditions.push('pr.patient_id = ?')
      args.push(params.patientId)
    }
    if (params.search) {
      conditions.push('(pr.prescription_no LIKE ? OR p.full_name LIKE ?)')
      const like = `%${params.search}%`
      args.push(like, like)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return db.prepare(`${withDetails} ${where} ORDER BY pr.presc_date DESC, pr.id DESC LIMIT 200`).all(...args)
  })

  ipcMain.handle('prescriptions:get', (_evt, id) => {
    const prescription = db.prepare(`${withDetails} WHERE pr.id = ?`).get(id)
    if (!prescription) return null
    const items = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ? ORDER BY sort_order ASC, id ASC').all(id)
    return { prescription, items }
  })

  ipcMain.handle('prescriptions:create', (_evt, data) => {
    const prescNo = nextYearlyCode(db, { table: 'prescriptions', column: 'prescription_no', prefix: 'RX', pad: 5 })
    const tx = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO prescriptions (prescription_no, patient_id, doctor_id, visit_id, presc_date, diagnosis, advice, follow_up_date)
        VALUES (@prescription_no, @patient_id, @doctor_id, @visit_id, @presc_date, @diagnosis, @advice, @follow_up_date)
      `).run({
        prescription_no: prescNo,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id || null,
        visit_id: data.visit_id || null,
        presc_date: data.presc_date || new Date().toISOString().slice(0, 10),
        diagnosis: data.diagnosis || null,
        advice: data.advice || null,
        follow_up_date: data.follow_up_date || null,
      })
      const prescId = info.lastInsertRowid
      const insertItem = db.prepare(`
        INSERT INTO prescription_items (prescription_id, drug_name, dosage, frequency, duration, instructions, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      ;(data.items || []).forEach((item, idx) => {
        insertItem.run(prescId, item.drug_name, item.dosage || null, item.frequency || null, item.duration || null, item.instructions || null, idx)
      })
      return prescId
    })
    const id = tx()
    return db.prepare(`${withDetails} WHERE pr.id = ?`).get(id)
  })

  ipcMain.handle('prescriptions:update', (_evt, data) => {
    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE prescriptions SET diagnosis = @diagnosis, advice = @advice, follow_up_date = @follow_up_date
        WHERE id = @id
      `).run({ id: data.id, diagnosis: data.diagnosis || null, advice: data.advice || null, follow_up_date: data.follow_up_date || null })

      if (Array.isArray(data.items)) {
        db.prepare('DELETE FROM prescription_items WHERE prescription_id = ?').run(data.id)
        const insertItem = db.prepare(`
          INSERT INTO prescription_items (prescription_id, drug_name, dosage, frequency, duration, instructions, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        data.items.forEach((item, idx) => {
          insertItem.run(data.id, item.drug_name, item.dosage || null, item.frequency || null, item.duration || null, item.instructions || null, idx)
        })
      }
    })
    tx()
    return db.prepare(`${withDetails} WHERE pr.id = ?`).get(data.id)
  })

  ipcMain.handle('prescriptions:remove', (_evt, id) => {
    db.prepare('DELETE FROM prescriptions WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('prescriptions:generatePdf', async (_evt, id) => {
    const filePath = await generatePrescriptionPdf(db, id)
    await shell.openPath(filePath)
    return { filePath }
  })

  ipcMain.handle('prescriptions:drugs', (_evt, query = '') => {
    const like = `%${query.trim()}%`
    if (!query.trim()) return db.prepare('SELECT * FROM drugs ORDER BY name ASC LIMIT 50').all()
    return db.prepare('SELECT * FROM drugs WHERE name LIKE ? OR generic_name LIKE ? ORDER BY name ASC LIMIT 50').all(like, like)
  })
}

module.exports = { register }
