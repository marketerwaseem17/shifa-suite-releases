const { getLicenseStatus, activateLicenseKey } = require('../license/license.cjs')

function register(ipcMain, db) {
  ipcMain.handle('license:getStatus', () => getLicenseStatus(db))

  ipcMain.handle('license:activate', (_evt, key) => activateLicenseKey(db, key))
}

module.exports = { register }
