const { shell } = require('electron')
const { fillTemplate } = require('./helpers.cjs')

function normalizePhone(raw) {
  if (!raw) return null
  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  if (digits.startsWith('0')) digits = '92' + digits.slice(1) // Pakistani local -> international
  if (!digits.startsWith('92') && digits.length === 10) digits = '92' + digits
  return digits
}

function register(ipcMain, db) {
  ipcMain.handle('communication:templates', () => {
    return db.prepare('SELECT * FROM communication_templates ORDER BY category ASC, language ASC').all()
  })

  ipcMain.handle('communication:saveTemplate', (_evt, data) => {
    if (data.id) {
      db.prepare(`UPDATE communication_templates SET name = ?, category = ?, language = ?, body = ? WHERE id = ?`)
        .run(data.name, data.category, data.language, data.body, data.id)
      return db.prepare('SELECT * FROM communication_templates WHERE id = ?').get(data.id)
    }
    const info = db.prepare(`
      INSERT INTO communication_templates (name, category, language, body, is_default)
      VALUES (?, ?, ?, ?, 0)
    `).run(data.name, data.category, data.language, data.body)
    return db.prepare('SELECT * FROM communication_templates WHERE id = ?').get(info.lastInsertRowid)
  })

  ipcMain.handle('communication:log', (_evt, params = {}) => {
    const conditions = []
    const args = []
    if (params.patientId) {
      conditions.push('c.patient_id = ?')
      args.push(params.patientId)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return db.prepare(`
      SELECT c.*, p.full_name AS patient_name, t.name AS template_name
      FROM communication_log c
      LEFT JOIN patients p ON p.id = c.patient_id
      LEFT JOIN communication_templates t ON t.id = c.template_id
      ${where} ORDER BY c.sent_at DESC LIMIT 200
    `).all(...args)
  })

  // Builds a wa.me deep link with the pre-filled message and opens it in the
  // user's default browser / WhatsApp Desktop — zero-cost, zero API risk.
  ipcMain.handle('communication:sendReminder', async (_evt, data) => {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(data.patient_id)
    if (!patient) throw new Error('Patient not found')
    const clinic = db.prepare('SELECT * FROM clinic_profile WHERE id = 1').get()
    const template = data.template_id
      ? db.prepare('SELECT * FROM communication_templates WHERE id = ?').get(data.template_id)
      : null

    const body = data.message || (template ? template.body : '')
    const message = fillTemplate(body, {
      patient_name: patient.full_name,
      date: data.date || '',
      time: data.time || '',
      clinic_name: clinic?.clinic_name || 'the clinic',
    })

    const phone = normalizePhone(data.phone || patient.phone)
    if (!phone) throw new Error('Patient has no phone number on file')

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    await shell.openExternal(url)

    db.prepare(`
      INSERT INTO communication_log (patient_id, appointment_id, template_id, channel, message, phone, status, sent_by)
      VALUES (?, ?, ?, 'whatsapp', ?, ?, 'opened', ?)
    `).run(patient.id, data.appointment_id || null, data.template_id || null, message, phone, data.sent_by || null)

    return { ok: true, url }
  })
}

module.exports = { register }
