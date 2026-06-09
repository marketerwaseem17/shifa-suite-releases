const { hashPassword } = require('../db/database.cjs')

function register(ipcMain, db) {
  const safeSelect = `id, full_name, username, role, specialization, qualification, phone, shift_notes, active, created_at`

  ipcMain.handle('staff:list', () => {
    return db.prepare(`SELECT ${safeSelect} FROM users ORDER BY active DESC, full_name ASC`).all()
  })

  ipcMain.handle('staff:create', (_evt, data) => {
    const stmt = db.prepare(`
      INSERT INTO users (full_name, username, password_hash, role, specialization, qualification, phone, shift_notes, active)
      VALUES (@full_name, @username, @password_hash, @role, @specialization, @qualification, @phone, @shift_notes, 1)
    `)
    const info = stmt.run({
      full_name: data.full_name,
      username: data.username,
      password_hash: hashPassword(data.password || 'changeme123'),
      role: data.role || 'receptionist',
      specialization: data.specialization || null,
      qualification: data.qualification || null,
      phone: data.phone || null,
      shift_notes: data.shift_notes || null,
    })
    return db.prepare(`SELECT ${safeSelect} FROM users WHERE id = ?`).get(info.lastInsertRowid)
  })

  ipcMain.handle('staff:update', (_evt, data) => {
    if (data.password) {
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(data.password), data.id)
    }
    db.prepare(`
      UPDATE users SET
        full_name = @full_name, role = @role, specialization = @specialization,
        qualification = @qualification, phone = @phone, shift_notes = @shift_notes, active = @active
      WHERE id = @id
    `).run({
      id: data.id,
      full_name: data.full_name,
      role: data.role || 'receptionist',
      specialization: data.specialization || null,
      qualification: data.qualification || null,
      phone: data.phone || null,
      shift_notes: data.shift_notes || null,
      active: data.active ? 1 : 0,
    })
    return db.prepare(`SELECT ${safeSelect} FROM users WHERE id = ?`).get(data.id)
  })

  ipcMain.handle('staff:remove', (_evt, id) => {
    db.prepare(`UPDATE users SET active = 0 WHERE id = ?`).run(id)
    return { ok: true }
  })
}

module.exports = { register }
