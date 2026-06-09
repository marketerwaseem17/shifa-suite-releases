const path = require('node:path')
const fs = require('node:fs')
const { app, dialog } = require('electron')
const { dbFilePath } = require('../db/database.cjs')

function logosDir() {
  const dir = path.join(app.getPath('userData'), 'branding')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function logoToDataUrl(logoPath) {
  if (!logoPath || !fs.existsSync(logoPath)) return null
  const ext = path.extname(logoPath).toLowerCase().replace('.', '')
  const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg'
  const bytes = fs.readFileSync(logoPath)
  return `data:${mime};base64,${bytes.toString('base64')}`
}

function register(ipcMain, db, getWindow) {
  ipcMain.handle('settings:getClinicProfile', () => {
    const row = db.prepare('SELECT * FROM clinic_profile WHERE id = 1').get()
    if (!row) return null
    return {
      ...row,
      doctors: row.doctors ? JSON.parse(row.doctors) : [],
      timings: row.timings ? JSON.parse(row.timings) : null,
      logoDataUrl: logoToDataUrl(row.logo_path),
    }
  })

  ipcMain.handle('settings:saveClinicProfile', (_evt, data) => {
    const exists = db.prepare('SELECT id FROM clinic_profile WHERE id = 1').get()
    const payload = {
      clinic_name: data.clinic_name,
      tagline: data.tagline || null,
      clinic_type: data.clinic_type || 'general',
      logo_path: data.logo_path || null,
      address: data.address,
      city: data.city || null,
      maps_link: data.maps_link || null,
      phone: data.phone,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      doctors: JSON.stringify(data.doctors || []),
      timings: JSON.stringify(data.timings || null),
      registration_no: data.registration_no || null,
      language: data.language || 'en',
      onboarding_done: data.onboarding_done ? 1 : 0,
    }
    if (exists) {
      db.prepare(`
        UPDATE clinic_profile SET
          clinic_name=@clinic_name, tagline=@tagline, clinic_type=@clinic_type, logo_path=@logo_path,
          address=@address, city=@city, maps_link=@maps_link, phone=@phone, whatsapp=@whatsapp,
          email=@email, doctors=@doctors, timings=@timings, registration_no=@registration_no,
          language=@language, onboarding_done=@onboarding_done, updated_at=datetime('now')
        WHERE id = 1
      `).run(payload)
    } else {
      db.prepare(`
        INSERT INTO clinic_profile
          (id, clinic_name, tagline, clinic_type, logo_path, address, city, maps_link, phone,
           whatsapp, email, doctors, timings, registration_no, language, onboarding_done)
        VALUES (1, @clinic_name, @tagline, @clinic_type, @logo_path, @address, @city, @maps_link, @phone,
                @whatsapp, @email, @doctors, @timings, @registration_no, @language, @onboarding_done)
      `).run(payload)
    }
    const row = db.prepare('SELECT * FROM clinic_profile WHERE id = 1').get()
    return { ...row, doctors: JSON.parse(row.doctors || '[]'), timings: row.timings ? JSON.parse(row.timings) : null }
  })

  ipcMain.handle('settings:uploadLogo', async () => {
    const win = getWindow()
    const result = await dialog.showOpenDialog(win, {
      title: 'Select clinic logo',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const src = result.filePaths[0]
    const ext = path.extname(src).toLowerCase()
    const dest = path.join(logosDir(), `logo${ext}`)
    fs.copyFileSync(src, dest)
    return { logo_path: dest, logoDataUrl: logoToDataUrl(dest) }
  })

  ipcMain.handle('settings:backupDatabase', async () => {
    const win = getWindow()
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const result = await dialog.showSaveDialog(win, {
      title: 'Backup Shifa Suite database',
      defaultPath: `shifa-suite-backup_${stamp}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    if (result.canceled || !result.filePath) return null
    db.pragma('wal_checkpoint(FULL)')
    fs.copyFileSync(dbFilePath(), result.filePath)
    return { filePath: result.filePath }
  })

  ipcMain.handle('settings:restoreDatabase', async () => {
    const win = getWindow()
    const confirm = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Cancel', 'Restore & Restart'],
      defaultId: 0,
      cancelId: 0,
      title: 'Restore database',
      message: 'Restoring will replace all current data with the backup file.',
      detail: 'Shifa Suite will restart after restoring. This cannot be undone — make sure you have a current backup if needed.',
    })
    if (confirm.response !== 1) return null

    const result = await dialog.showOpenDialog(win, {
      title: 'Select a Shifa Suite backup file',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return null

    const target = dbFilePath()
    db.pragma('wal_checkpoint(FULL)')
    db.close()
    fs.copyFileSync(result.filePaths[0], target)
    app.relaunch()
    app.exit(0)
    return { ok: true }
  })
}

module.exports = { register }
