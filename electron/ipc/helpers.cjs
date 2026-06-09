// Shared helpers for IPC handler modules.

function nextSequenceCode(db, { table, column, prefix, pad = 5 }) {
  const like = `${prefix}-%`
  const row = db
    .prepare(
      `SELECT ${column} AS code FROM ${table} WHERE ${column} LIKE ? ORDER BY id DESC LIMIT 1`
    )
    .get(like)
  let next = 1
  if (row && row.code) {
    const parts = row.code.split('-')
    const n = parseInt(parts[parts.length - 1], 10)
    if (!Number.isNaN(n)) next = n + 1
  }
  return `${prefix}-${String(next).padStart(pad, '0')}`
}

function nextYearlyCode(db, { table, column, prefix, pad = 5 }) {
  const year = new Date().getFullYear()
  const like = `${prefix}-${year}-%`
  const row = db
    .prepare(
      `SELECT ${column} AS code FROM ${table} WHERE ${column} LIKE ? ORDER BY id DESC LIMIT 1`
    )
    .get(like)
  let next = 1
  if (row && row.code) {
    const parts = row.code.split('-')
    const n = parseInt(parts[parts.length - 1], 10)
    if (!Number.isNaN(n)) next = n + 1
  }
  return `${prefix}-${year}-${String(next).padStart(pad, '0')}`
}

function paginate(params = {}) {
  const page = Math.max(1, parseInt(params.page, 10) || 1)
  const pageSize = Math.min(200, Math.max(1, parseInt(params.pageSize, 10) || 25))
  return { page, pageSize, offset: (page - 1) * pageSize }
}

function fillTemplate(body, tokens = {}) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => (tokens[key] != null ? String(tokens[key]) : ''))
}

module.exports = { nextSequenceCode, nextYearlyCode, paginate, fillTemplate }
