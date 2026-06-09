const { contextBridge, ipcRenderer } = require('electron')

// Thin invoke bridge — every IPC channel is namespaced as "module:action"
// and forwarded as-is. Renderer never touches Node/fs/db directly.
const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload)

contextBridge.exposeInMainWorld('shifa', {
  patients: {
    list: (params) => invoke('patients:list', params),
    get: (id) => invoke('patients:get', id),
    create: (data) => invoke('patients:create', data),
    update: (data) => invoke('patients:update', data),
    remove: (id) => invoke('patients:remove', id),
    addVisit: (data) => invoke('patients:addVisit', data),
    addAttachment: (data) => invoke('patients:addAttachment', data),
  },
  appointments: {
    list: (params) => invoke('appointments:list', params),
    create: (data) => invoke('appointments:create', data),
    update: (data) => invoke('appointments:update', data),
    remove: (id) => invoke('appointments:remove', id),
    checkConflict: (data) => invoke('appointments:checkConflict', data),
    queue: (params) => invoke('appointments:queue', params),
  },
  staff: {
    list: () => invoke('staff:list'),
    create: (data) => invoke('staff:create', data),
    update: (data) => invoke('staff:update', data),
    remove: (id) => invoke('staff:remove', id),
  },
  billing: {
    list: (params) => invoke('billing:list', params),
    get: (id) => invoke('billing:get', id),
    create: (data) => invoke('billing:create', data),
    update: (data) => invoke('billing:update', data),
    recordPayment: (data) => invoke('billing:recordPayment', data),
    remove: (id) => invoke('billing:remove', id),
    dailySummary: (date) => invoke('billing:dailySummary', date),
    generatePdf: (id) => invoke('billing:generatePdf', id),
  },
  prescriptions: {
    list: (params) => invoke('prescriptions:list', params),
    get: (id) => invoke('prescriptions:get', id),
    create: (data) => invoke('prescriptions:create', data),
    update: (data) => invoke('prescriptions:update', data),
    remove: (id) => invoke('prescriptions:remove', id),
    generatePdf: (id) => invoke('prescriptions:generatePdf', id),
    drugs: (query) => invoke('prescriptions:drugs', query),
  },
  lab: {
    list: (params) => invoke('lab:list', params),
    create: (data) => invoke('lab:create', data),
    update: (data) => invoke('lab:update', data),
    remove: (id) => invoke('lab:remove', id),
    pickResultFile: () => invoke('lab:pickResultFile'),
    attachResult: (data) => invoke('lab:attachResult', data),
  },
  inventory: {
    list: (params) => invoke('inventory:list', params),
    create: (data) => invoke('inventory:create', data),
    update: (data) => invoke('inventory:update', data),
    remove: (id) => invoke('inventory:remove', id),
    adjustStock: (data) => invoke('inventory:adjustStock', data),
    suppliers: () => invoke('inventory:suppliers'),
    createSupplier: (data) => invoke('inventory:createSupplier', data),
    purchaseOrders: () => invoke('inventory:purchaseOrders'),
    createPurchaseOrder: (data) => invoke('inventory:createPurchaseOrder', data),
    lowStock: () => invoke('inventory:lowStock'),
  },
  reports: {
    revenue: (params) => invoke('reports:revenue', params),
    expenses: (params) => invoke('reports:expenses', params),
    addExpense: (data) => invoke('reports:addExpense', data),
    profitSummary: (params) => invoke('reports:profitSummary', params),
    exportExcel: (params) => invoke('reports:exportExcel', params),
    exportPdf: (params) => invoke('reports:exportPdf', params),
  },
  communication: {
    templates: () => invoke('communication:templates', undefined),
    saveTemplate: (data) => invoke('communication:saveTemplate', data),
    log: (params) => invoke('communication:log', params),
    sendReminder: (data) => invoke('communication:sendReminder', data),
  },
  settings: {
    getClinicProfile: () => invoke('settings:getClinicProfile'),
    saveClinicProfile: (data) => invoke('settings:saveClinicProfile', data),
    uploadLogo: () => invoke('settings:uploadLogo'),
    backupDatabase: () => invoke('settings:backupDatabase'),
    restoreDatabase: () => invoke('settings:restoreDatabase'),
  },
  license: {
    getStatus: () => invoke('license:getStatus'),
    activate: (key) => invoke('license:activate', key),
  },
  dashboard: {
    summary: () => invoke('dashboard:summary'),
  },
  app: {
    getVersion: () => invoke('app:getVersion'),
    openExternal: (url) => invoke('app:openExternal', url),
  },
})
