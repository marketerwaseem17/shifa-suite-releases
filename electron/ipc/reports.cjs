const path = require('node:path')
const fs = require('node:fs')
const { app, shell } = require('electron')
const ExcelJS = require('exceljs')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
const { exportsDir } = require('../pdf/documents.cjs')

const TEAL = rgb(0x0e / 255, 0x7c / 255, 0x86 / 255)
const CHARCOAL = rgb(0x33 / 255, 0x33 / 255, 0x33 / 255)

function register(ipcMain, db) {
  ipcMain.handle('reports:revenue', (_evt, params = {}) => {
    const from = params.from || new Date().toISOString().slice(0, 8) + '01'
    const to = params.to || new Date().toISOString().slice(0, 10)
    const daily = db.prepare(`
      SELECT invoice_date AS date, COALESCE(SUM(total),0) AS billed, COALESCE(SUM(paid_amount),0) AS collected
      FROM invoices WHERE invoice_date BETWEEN ? AND ? AND status != 'void'
      GROUP BY invoice_date ORDER BY invoice_date ASC
    `).all(from, to)
    const totals = db.prepare(`
      SELECT COALESCE(SUM(total),0) AS billed, COALESCE(SUM(paid_amount),0) AS collected,
             COALESCE(SUM(due_amount),0) AS outstanding, COUNT(*) AS invoice_count
      FROM invoices WHERE invoice_date BETWEEN ? AND ? AND status != 'void'
    `).get(from, to)
    return { from, to, daily, totals }
  })

  ipcMain.handle('reports:expenses', (_evt, params = {}) => {
    const from = params.from || new Date().toISOString().slice(0, 8) + '01'
    const to = params.to || new Date().toISOString().slice(0, 10)
    const rows = db.prepare(`SELECT * FROM expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC`).all(from, to)
    const byCategory = db.prepare(`
      SELECT category, COALESCE(SUM(amount),0) AS amount FROM expenses
      WHERE expense_date BETWEEN ? AND ? GROUP BY category ORDER BY amount DESC
    `).all(from, to)
    const total = rows.reduce((s, r) => s + r.amount, 0)
    return { from, to, rows, byCategory, total }
  })

  ipcMain.handle('reports:addExpense', (_evt, data) => {
    const info = db.prepare(`
      INSERT INTO expenses (category, description, amount, expense_date, recorded_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.category, data.description || null, Number(data.amount), data.expense_date || new Date().toISOString().slice(0, 10), data.recorded_by || null)
    return db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid)
  })

  ipcMain.handle('reports:profitSummary', (_evt, params = {}) => {
    const from = params.from || new Date().toISOString().slice(0, 8) + '01'
    const to = params.to || new Date().toISOString().slice(0, 10)
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(paid_amount),0) AS s FROM invoices WHERE invoice_date BETWEEN ? AND ? AND status != 'void'
    `).get(from, to).s
    const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM expenses WHERE expense_date BETWEEN ? AND ?`).get(from, to).s
    return { from, to, revenue, expenses, profit: revenue - expenses }
  })

  ipcMain.handle('reports:exportExcel', async (_evt, params = {}) => {
    const from = params.from || new Date().toISOString().slice(0, 8) + '01'
    const to = params.to || new Date().toISOString().slice(0, 10)
    const invoices = db.prepare(`
      SELECT i.invoice_no, i.invoice_date, p.full_name AS patient, i.subtotal, i.discount, i.tax, i.total, i.paid_amount, i.due_amount, i.status
      FROM invoices i JOIN patients p ON p.id = i.patient_id
      WHERE i.invoice_date BETWEEN ? AND ? AND i.status != 'void'
      ORDER BY i.invoice_date ASC
    `).all(from, to)
    const expenses = db.prepare(`SELECT expense_date, category, description, amount FROM expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date ASC`).all(from, to)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Shifa Suite'
    wb.created = new Date()

    const invSheet = wb.addWorksheet('Revenue')
    invSheet.columns = [
      { header: 'Invoice No', key: 'invoice_no', width: 16 },
      { header: 'Date', key: 'invoice_date', width: 14 },
      { header: 'Patient', key: 'patient', width: 26 },
      { header: 'Subtotal', key: 'subtotal', width: 14 },
      { header: 'Discount', key: 'discount', width: 12 },
      { header: 'Tax', key: 'tax', width: 10 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Paid', key: 'paid_amount', width: 14 },
      { header: 'Due', key: 'due_amount', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
    ]
    invSheet.getRow(1).font = { bold: true }
    invSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4F6' } }
    invoices.forEach((row) => invSheet.addRow(row))

    const expSheet = wb.addWorksheet('Expenses')
    expSheet.columns = [
      { header: 'Date', key: 'expense_date', width: 14 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Description', key: 'description', width: 36 },
      { header: 'Amount', key: 'amount', width: 14 },
    ]
    expSheet.getRow(1).font = { bold: true }
    expSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4F6' } }
    expenses.forEach((row) => expSheet.addRow(row))

    const summarySheet = wb.addWorksheet('Summary')
    const totalRevenue = invoices.reduce((s, r) => s + r.paid_amount, 0)
    const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0)
    summarySheet.addRows([
      ['Shifa Suite — Financial Report'],
      [`Period: ${from} to ${to}`],
      [],
      ['Total Revenue Collected', totalRevenue],
      ['Total Expenses', totalExpenses],
      ['Net Profit', totalRevenue - totalExpenses],
    ])
    summarySheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF0E7C86' } }
    summarySheet.getColumn(1).width = 28
    summarySheet.getColumn(2).width = 18

    const dir = exportsDir('reports')
    const filePath = path.join(dir, `Financial-Report_${from}_to_${to}.xlsx`)
    await wb.xlsx.writeFile(filePath)
    await shell.openPath(filePath)
    return { filePath }
  })

  ipcMain.handle('reports:exportPdf', async (_evt, params = {}) => {
    const from = params.from || new Date().toISOString().slice(0, 8) + '01'
    const to = params.to || new Date().toISOString().slice(0, 10)
    const clinic = db.prepare('SELECT * FROM clinic_profile WHERE id = 1').get()
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(total),0) AS billed, COALESCE(SUM(paid_amount),0) AS collected, COALESCE(SUM(due_amount),0) AS outstanding
      FROM invoices WHERE invoice_date BETWEEN ? AND ? AND status != 'void'
    `).get(from, to)
    const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM expenses WHERE expense_date BETWEEN ? AND ?`).get(from, to).s

    const pdfDoc = await PDFDocument.create()
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const page = pdfDoc.addPage([595.28, 841.89])
    let y = 793

    page.drawText(clinic?.clinic_name || 'Clinic', { x: 48, y, size: 16, font: bold, color: TEAL })
    y -= 22
    page.drawText('Financial Summary Report', { x: 48, y, size: 13, font: bold, color: CHARCOAL })
    y -= 16
    page.drawText(`Period: ${from} to ${to}`, { x: 48, y, size: 10, font: regular, color: CHARCOAL })
    y -= 30

    const lines = [
      ['Total Billed', revenue.billed],
      ['Total Collected', revenue.collected],
      ['Outstanding Dues', revenue.outstanding],
      ['Total Expenses', expenses],
      ['Net Profit (Collected - Expenses)', revenue.collected - expenses],
    ]
    lines.forEach(([label, val], i) => {
      page.drawText(label, { x: 48, y: y - i * 22, size: 11, font: regular, color: CHARCOAL })
      const valStr = `Rs. ${Number(val).toLocaleString('en-PK')}`
      page.drawText(valStr, { x: 360, y: y - i * 22, size: 11, font: bold, color: CHARCOAL })
    })

    const bytes = await pdfDoc.save()
    const dir = exportsDir('reports')
    const filePath = path.join(dir, `Financial-Summary_${from}_to_${to}.pdf`)
    fs.writeFileSync(filePath, bytes)
    await shell.openPath(filePath)
    return { filePath }
  })
}

module.exports = { register }
