function register(ipcMain, db) {
  const withDetails = `
    SELECT a.*, p.full_name AS patient_name, p.phone AS patient_phone, p.patient_code,
           u.full_name AS doctor_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN users u ON u.id = a.doctor_id
  `

  ipcMain.handle('appointments:list', (_evt, params = {}) => {
    const conditions = []
    const args = []
    if (params.date) {
      conditions.push('a.appt_date = ?')
      args.push(params.date)
    }
    if (params.from && params.to) {
      conditions.push('a.appt_date BETWEEN ? AND ?')
      args.push(params.from, params.to)
    }
    if (params.doctorId) {
      conditions.push('a.doctor_id = ?')
      args.push(params.doctorId)
    }
    if (params.status) {
      conditions.push('a.status = ?')
      args.push(params.status)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = db
      .prepare(`${withDetails} ${where} ORDER BY a.appt_date ASC, a.start_time ASC`)
      .all(...args)
    return rows
  })

  ipcMain.handle('appointments:queue', (_evt, params = {}) => {
    const date = params.date || new Date().toISOString().slice(0, 10)
    const rows = db
      .prepare(
        `${withDetails} WHERE a.appt_date = ? AND a.status IN ('scheduled','checked-in','in-progress')
         ORDER BY (a.source = 'walk-in') ASC, a.queue_no ASC, a.start_time ASC`
      )
      .all(date)
    return rows
  })

  ipcMain.handle('appointments:checkConflict', (_evt, data) => {
    if (!data.doctor_id) return { conflict: false }
    const row = db
      .prepare(
        `SELECT id FROM appointments
         WHERE doctor_id = ? AND appt_date = ? AND status NOT IN ('cancelled','no-show')
           AND id != COALESCE(?, -1)
           AND NOT (end_time <= ? OR start_time >= ?)
         LIMIT 1`
      )
      .get(data.doctor_id, data.appt_date, data.id || null, data.start_time, data.end_time)
    return { conflict: Boolean(row) }
  })

  ipcMain.handle('appointments:create', (_evt, data) => {
    let queueNo = null
    if (data.source === 'walk-in') {
      const row = db
        .prepare(`SELECT COALESCE(MAX(queue_no), 0) AS m FROM appointments WHERE appt_date = ? AND source = 'walk-in'`)
        .get(data.appt_date)
      queueNo = (row?.m || 0) + 1
    }
    const stmt = db.prepare(`
      INSERT INTO appointments
        (patient_id, doctor_id, appt_date, start_time, end_time, source, status, reason, notes, queue_no)
      VALUES (@patient_id, @doctor_id, @appt_date, @start_time, @end_time, @source, @status, @reason, @notes, @queue_no)
    `)
    const info = stmt.run({
      patient_id: data.patient_id,
      doctor_id: data.doctor_id || null,
      appt_date: data.appt_date,
      start_time: data.start_time,
      end_time: data.end_time,
      source: data.source || 'booked',
      status: data.status || 'scheduled',
      reason: data.reason || null,
      notes: data.notes || null,
      queue_no: queueNo,
    })
    return db.prepare(`${withDetails} WHERE a.id = ?`).get(info.lastInsertRowid)
  })

  ipcMain.handle('appointments:update', (_evt, data) => {
    const stmt = db.prepare(`
      UPDATE appointments SET
        patient_id = @patient_id, doctor_id = @doctor_id, appt_date = @appt_date,
        start_time = @start_time, end_time = @end_time, source = @source,
        status = @status, reason = @reason, notes = @notes, updated_at = datetime('now')
      WHERE id = @id
    `)
    stmt.run({
      id: data.id,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id || null,
      appt_date: data.appt_date,
      start_time: data.start_time,
      end_time: data.end_time,
      source: data.source || 'booked',
      status: data.status || 'scheduled',
      reason: data.reason || null,
      notes: data.notes || null,
    })
    return db.prepare(`${withDetails} WHERE a.id = ?`).get(data.id)
  })

  ipcMain.handle('appointments:remove', (_evt, id) => {
    db.prepare('DELETE FROM appointments WHERE id = ?').run(id)
    return { ok: true }
  })
}

module.exports = { register }
