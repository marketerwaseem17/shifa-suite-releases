const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('node:path')

const isDev = !app.isPackaged

const { getDb, closeDb } = require('./db/database.cjs')
const { registerIpcHandlers } = require('./ipc/index.cjs')

// In dev: icon is at <project>/resources/icon.png (beside electron/)
// In packaged: extraResources copies resources/ next to app.asar → process.resourcesPath/resources/
const iconPath = isDev
  ? path.join(__dirname, '..', 'resources', 'icon.png')
  : path.join(process.resourcesPath, 'resources', 'icon.png')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#E8F4F6',
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  // Open external links (e.g. wa.me) in the default browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  const db = getDb()
  registerIpcHandlers(ipcMain, db, () => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeDb()
})
