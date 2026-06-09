function register(ipcMain, db) {
  ipcMain.handle('dashboard:summary', () => {
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = today.slice(0, 8) + '01'

    const todaysAppointments = db.prepare(`
      SELECT COUNT(*) AS n FROM appointments WHERE appt_date = ? AND status NOT IN ('cancelled')
    `).get(today).n

    const todaysQueue = db.prepare(`
      SELECT COUNT(*) AS n FROM appointments WHERE appt_date = ? AND status IN ('scheduled','checked-in','in-progress')
    `).get(today).n

    const todaysRevenue = db.prepare(`
      SELECT COALESCE(SUM(paid_amount),0) AS s FROM invoices WHERE invoice_date = ? AND status != 'void'
    `).get(today).s

    const monthRevenue = db.prepare(`
      SELECT COALESCE(SUM(paid_amount),0) AS s FROM invoices WHERE invoice_date BETWEEN ? AND ? AND status != 'void'
    `).get(monthStart, today).s

    const revenueTrend = db.prepare(`
      SELECT invoice_date AS date, COALESCE(SUM(paid_amount),0) AS amount
      FROM invoices WHERE invoice_date BETWEEN date(?, '-13 days') AND ? AND status != 'void'
      GROUP BY invoice_date ORDER BY invoice_date ASC
    `).all(today, today)

    const newPatientsThisMonth = db.prepare(`
      SELECT COUNT(*) AS n FROM patients WHERE date(created_at) BETWEEN ? AND ?
    `).get(monthStart, today).n

    const patientGrowth = db.prepare(`
      SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS n
      FROM patients GROUP BY month ORDER BY month DESC LIMIT 6
    `).all().reverse()

    const topDiagnoses = db.prepare(`
      SELECT diagnosis, COUNT(*) AS n FROM patient_visits
      WHERE diagnosis IS NOT NULL AND diagnosis != '' AND visit_date >= datetime(?, '-30 days')
      GROUP BY diagnosis ORDER BY n DESC LIMIT 5
    `).all(today)

    const topMedicines = db.prepare(`
      SELECT drug_name, COUNT(*) AS n FROM prescription_items pi
      JOIN prescriptions pr ON pr.id = pi.prescription_id
      WHERE pr.presc_date >= date(?, '-30 days')
      GROUP BY drug_name ORDER BY n DESC LIMIT 5
    `).all(today)

    const lowStockCount = db.prepare(`SELECT COUNT(*) AS n FROM inventory_items WHERE quantity <= reorder_level`).get().n

    const pendingLabOrders = db.prepare(`SELECT COUNT(*) AS n FROM lab_orders WHERE status = 'pending'`).get().n

    return {
      today,
      todaysAppointments,
      todaysQueue,
      todaysRevenue,
      monthRevenue,
      revenueTrend,
      newPatientsThisMonth,
      patientGrowth,
      topDiagnoses,
      topMedicines,
      lowStockCount,
      pendingLabOrders,
    }
  })
}

module.exports = { register }
