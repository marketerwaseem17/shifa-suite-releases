const { app, shell } = require('electron')

const modules = [
  require('./patients.cjs'),
  require('./appointments.cjs'),
  require('./staff.cjs'),
  require('./billing.cjs'),
  require('./prescriptions.cjs'),
  require('./lab.cjs'),
  require('./inventory.cjs'),
  require('./reports.cjs'),
  require('./communication.cjs'),
  require('./settings.cjs'),
  require('./license.cjs'),
  require('./dashboard.cjs'),
]

function registerIpcHandlers(ipcMain, db, getWindow) {
  modules.forEach((mod) => mod.register(ipcMain, db, getWindow))

  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:openExternal', (_evt, url) => shell.openExternal(url))
}

module.exports = { registerIpcHandlers }
