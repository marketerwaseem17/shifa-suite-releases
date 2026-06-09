const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const { app } = require('electron')
const Database = require('better-sqlite3')

let dbInstance = null

function dbFilePath() {
  const userData = app.getPath('userData')
  return path.join(userData, 'shifa-suite.db')
}

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

function seed(db) {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n
  if (userCount === 0) {
    db.prepare(
      `INSERT INTO users (full_name, username, password_hash, role, active)
       VALUES (?, ?, ?, 'admin', 1)`
    ).run('Clinic Admin', 'admin', hashPassword('admin123'))
  }

  const licenseRow = db.prepare('SELECT id FROM license WHERE id = 1').get()
  if (!licenseRow) {
    db.prepare(
      `INSERT INTO license (id, tier, trial_started_at, updated_at)
       VALUES (1, 'trial', datetime('now'), datetime('now'))`
    ).run()
  }

  const drugCount = db.prepare('SELECT COUNT(*) AS n FROM drugs').get().n
  if (drugCount === 0) {
    const seedPath = path.join(__dirname, 'seed-drugs.json')
    if (fs.existsSync(seedPath)) {
      const drugs = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
      const insert = db.prepare(
        `INSERT INTO drugs (name, generic_name, category, common_dosage, common_form)
         VALUES (@name, @generic_name, @category, @common_dosage, @common_form)`
      )
      const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)))
      insertMany(drugs)
    }
  }

  const templateCount = db.prepare('SELECT COUNT(*) AS n FROM communication_templates').get().n
  if (templateCount === 0) {
    const templates = [
      {
        name: 'Appointment Reminder (Roman Urdu)',
        category: 'reminder',
        language: 'roman-ur',
        body: 'Assalam-o-Alaikum {{patient_name}}, aap ka appointment {{clinic_name}} mein {{date}} ko {{time}} baje hai. Waqt par tashreef layein. Shukriya.',
        is_default: 1,
      },
      {
        name: 'Appointment Reminder (English)',
        category: 'reminder',
        language: 'en',
        body: 'Dear {{patient_name}}, this is a reminder for your appointment at {{clinic_name}} on {{date}} at {{time}}. Please arrive 10 minutes early. Thank you.',
        is_default: 1,
      },
      {
        name: 'Follow-up Reminder (Roman Urdu)',
        category: 'follow-up',
        language: 'roman-ur',
        body: 'Assalam-o-Alaikum {{patient_name}}, doctor sahab ne aap ko {{date}} ko follow-up ke liye bulaya hai. براہ مہربانی apna appointment confirm karwa lein. {{clinic_name}}',
        is_default: 1,
      },
      {
        name: 'Follow-up Reminder (English)',
        category: 'follow-up',
        language: 'en',
        body: 'Hi {{patient_name}}, your doctor has recommended a follow-up visit on {{date}}. Please call {{clinic_name}} to confirm your slot.',
        is_default: 1,
      },
    ]
    const insert = db.prepare(
      `INSERT INTO communication_templates (name, category, language, body, is_default)
       VALUES (@name, @category, @language, @body, @is_default)`
    )
    const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)))
    insertMany(templates)
  }
}

function getDb() {
  if (dbInstance) return dbInstance

  const filePath = dbFilePath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  dbInstance = new Database(filePath)
  dbInstance.pragma('journal_mode = WAL')
  dbInstance.pragma('foreign_keys = ON')

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
  dbInstance.exec(schema)

  seed(dbInstance)

  return dbInstance
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

module.exports = { getDb, closeDb, dbFilePath, hashPassword }
