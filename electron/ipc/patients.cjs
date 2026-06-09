const { nextSequenceCode, paginate } = require('./helpers.cjs')

function register(ipcMain, db) {
  ipcMain.handle('patients:list', (_evt, params = {}) => {
    const { search = '', page, pageSize, offset } = paginate(params)
    const like = `%${search.trim()}%`
    const where = search.trim()
      ? `WHERE active = 1 AND (full_name LIKE ? OR phone LIKE ? OR cnic LIKE ? OR patient_code LIKE ?)`
      : `WHERE active = 1`
    const args = search.trim() ? [like, like, like, like] : []

    const total = db.prepare(`SELECT COUNT(*) AS n FROM patients ${where}`).get(...args).n
    const rows = db
      .prepare(
        `SELECT * FROM patients ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...args, pageSize, offset)
    return { rows, total, page, pageSize }
  })

  ipcMain.handle('patients:get', (_evt, id) => {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id)
    if (!patient) return null
    const visits = db
      .prepare('SELECT * FROM patient_visits WHERE patient_id = ? ORDER BY visit_date DESC')
      .all(id)
    const attachments = db
      .prepare('SELECT * FROM patient_attachments WHERE patient_id = ? ORDER BY uploaded_at DESC')
      .all(id)
    const appointments = db
      .prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY appt_date DESC, start_time DESC')
      .all(id)
    const invoices = db
      .prepare('SELECT * FROM invoices WHERE patient_id = ? ORDER BY invoice_date DESC')
      .all(id)
    const prescriptions = db
      .prepare('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY presc_date DESC')
      .all(id)
    const labOrders = db
      .prepare('SELECT * FROM lab_orders WHERE patient_id = ? ORDER BY order_date DESC')
      .all(id)
    return { patient, visits, attachments, appointments, invoices, prescriptions, labOrders }
  })

  ipcMain.handle('patients:create', (_evt, data) => {
    const code = nextSequenceCode(db, { table: 'patients', column: 'patient_code', prefix: 'SHF', pad: 5 })
    const stmt = db.prepare(`
      INSERT INTO patients
        (patient_code, full_name, phone, cnic, gender, dob, blood_group, address,
         guardian_name, allergies, chronic_conditions, medical_history, notes)
      VALUES (@patient_code, @full_name, @phone, @cnic, @gender, @dob, @blood_group, @address,
              @guardian_name, @allergies, @chronic_conditions, @medical_history, @notes)
    `)
    const info = stmt.run({
      patient_code: code,
      full_name: data.full_name,
      phone: data.phone || null,
      cnic: data.cnic || null,
      gender: data.gender || null,
      dob: data.dob || null,
      blood_group: data.blood_group || null,
      address: data.address || null,
      guardian_name: data.guardian_name || null,
      allergies: data.allergies || null,
      chronic_conditions: data.chronic_conditions || null,
      medical_history: data.medical_history || null,
      notes: data.notes || null,
    })
    return db.prepare('SELECT * FROM patients WHERE id = ?').get(info.lastInsertRowid)
  })

  ipcMain.handle('patients:update', (_evt, data) => {
    const stmt = db.prepare(`
      UPDATE patients SET
        full_name = @full_name, phone = @phone, cnic = @cnic, gender = @gender, dob = @dob,
        blood_group = @blood_group, address = @address, guardian_name = @guardian_name,
        allergies = @allergies, chronic_conditions = @chronic_conditions,
        medical_history = @medical_history, notes = @notes, updated_at = datetime('now')
      WHERE id = @id
    `)
    stmt.run({
      id: data.id,
      full_name: data.full_name,
      phone: data.phone || null,
      cnic: data.cnic || null,
      gender: data.gender || null,
      dob: data.dob || null,
      blood_group: data.blood_group || null,
      address: data.address || null,
      guardian_name: data.guardian_name || null,
      allergies: data.allergies || null,
      chronic_conditions: data.chronic_conditions || null,
      medical_history: data.medical_history || null,
      notes: data.notes || null,
    })
    return db.prepare('SELECT * FROM patients WHERE id = ?').get(data.id)
  })

  ipcMain.handle('patients:remove', (_evt, id) => {
    db.prepare(`UPDATE patients SET active = 0, updated_at = datetime('now') WHERE id = ?`).run(id)
    return { ok: true }
  })

  ipcMain.handle('patients:addVisit', (_evt, data) => {
    const stmt = db.prepare(`
      INSERT INTO patient_visits
        (patient_id, doctor_id, appointment_id, visit_type, vitals, complaint,
         diagnosis, treatment_plan, specialty_data, follow_up_date)
      VALUES (@patient_id, @doctor_id, @appointment_id, @visit_type, @vitals, @complaint,
              @diagnosis, @treatment_plan, @specialty_data, @follow_up_date)
    `)
    const info = stmt.run({
      patient_id: data.patient_id,
      doctor_id: data.doctor_id || null,
      appointment_id: data.appointment_id || null,
      visit_type: data.visit_type || 'consultation',
      vitals: data.vitals ? JSON.stringify(data.vitals) : null,
      complaint: data.complaint || null,
      diagnosis: data.diagnosis || null,
      treatment_plan: data.treatment_plan || null,
      specialty_data: data.specialty_data ? JSON.stringify(data.specialty_data) : null,
      follow_up_date: data.follow_up_date || null,
    })
    return db.prepare('SELECT * FROM patient_visits WHERE id = ?').get(info.lastInsertRowid)
  })

  ipcMain.handle('patients:addAttachment', (_evt, data) => {
    const stmt = db.prepare(`
      INSERT INTO patient_attachments (patient_id, visit_id, file_name, file_path, category)
      VALUES (@patient_id, @visit_id, @file_name, @file_path, @category)
    `)
    const info = stmt.run({
      patient_id: data.patient_id,
      visit_id: data.visit_id || null,
      file_name: data.file_name,
      file_path: data.file_path,
      category: data.category || 'other',
    })
    return db.prepare('SELECT * FROM patient_attachments WHERE id = ?').get(info.lastInsertRowid)
  })
}

module.exports = { register }
