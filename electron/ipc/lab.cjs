const path = require('node:path')
const fs = require('node:fs')
const { app, dialog } = require('electron')
const { nextYearlyCode } = require('./helpers.cjs')

function resultsDir() {
  const dir = path.join(app.getPath('userData'), 'lab-results')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function register(ipcMain, db, getWindow) {
  const withDetails = `
    SELECT l.*, p.full_name AS patient_name, p.patient_code, u.full_name AS doctor_name
    FROM lab_orders l
    JOIN patients p ON p.id = l.patient_id
    LEFT JOIN users u ON u.id = l.doctor_id
  `

  ipcMain.handle('lab:list', (_evt, params = {}) => {
    const conditions = []
    const args = []
    if (params.status) {
      conditions.push('l.status = ?')
      args.push(params.status)
    }
    if (params.patientId) {
      conditions.push('l.patient_id = ?')
      args.push(params.patientId)
    }
    if (params.search) {
      conditions.push('(l.order_no LIKE ? OR l.test_name LIKE ? OR p.full_name LIKE ?)')
      const like = `%${params.search}%`
      args.push(like, like, like)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return db.prepare(`${withDetails} ${where} ORDER BY l.order_date DESC, l.id DESC LIMIT 200`).all(...args)
  })

  ipcMain.handle('lab:create', (_evt, data) => {
    const orderNo = nextYearlyCode(db, { table: 'lab_orders', column: 'order_no', prefix: 'LAB', pad: 5 })
    const info = db.prepare(`
      INSERT INTO lab_orders (order_no, patient_id, doctor_id, visit_id, test_name, lab_name, order_date, status)
      VALUES (@order_no, @patient_id, @doctor_id, @visit_id, @test_name, @lab_name, @order_date, 'pending')
    `).run({
      order_no: orderNo,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id || null,
      visit_id: data.visit_id || null,
      test_name: data.test_name,
      lab_name: data.lab_name || null,
      order_date: data.order_date || new Date().toISOString().slice(0, 10),
    })
    return db.prepare(`${withDetails} WHERE l.id = ?`).get(info.lastInsertRowid)
  })

  ipcMain.handle('lab:update', (_evt, data) => {
    db.prepare(`
      UPDATE lab_orders SET test_name = @test_name, lab_name = @lab_name, status = @status,
        result_summary = @result_summary, completed_date = @completed_date
      WHERE id = @id
    `).run({
      id: data.id,
      test_name: data.test_name,
      lab_name: data.lab_name || null,
      status: data.status || 'pending',
      result_summary: data.result_summary || null,
      completed_date: data.status === 'completed' ? (data.completed_date || new Date().toISOString().slice(0, 10)) : null,
    })
    return db.prepare(`${withDetails} WHERE l.id = ?`).get(data.id)
  })

  ipcMain.handle('lab:remove', (_evt, id) => {
    db.prepare('DELETE FROM lab_orders WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('lab:pickResultFile', async () => {
    const win = getWindow()
    const result = await dialog.showOpenDialog(win, {
      title: 'Select lab result file',
      filters: [{ name: 'Reports', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const src = result.filePaths[0]
    const fileName = path.basename(src)
    const dest = path.join(resultsDir(), `${Date.now()}_${fileName}`)
    fs.copyFileSync(src, dest)
    return { file_path: dest, file_name: fileName }
  })

  ipcMain.handle('lab:attachResult', (_evt, data) => {
    db.prepare(`
      UPDATE lab_orders SET result_file_path = ?, status = 'completed', completed_date = COALESCE(completed_date, date('now'))
      WHERE id = ?
    `).run(data.file_path, data.id)
    return db.prepare(`${withDetails} WHERE l.id = ?`).get(data.id)
  })
}

module.exports = { register }
