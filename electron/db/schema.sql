-- Shifa Suite — local-first SQLite schema
-- Naming: snake_case tables/columns, INTEGER PRIMARY KEY rowid aliases for speed,
-- ISO-8601 strings for dates/times so they sort and compare lexically.

PRAGMA foreign_keys = ON;

-- ───────────────────────────── Clinic / Admin ─────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_profile (
  id                INTEGER PRIMARY KEY CHECK (id = 1), -- singleton row
  clinic_name       TEXT NOT NULL,
  tagline           TEXT,
  clinic_type       TEXT NOT NULL DEFAULT 'general',
  logo_path         TEXT,
  address           TEXT NOT NULL,
  city              TEXT,
  maps_link         TEXT,
  phone             TEXT NOT NULL,
  whatsapp          TEXT,
  email             TEXT,
  doctors           TEXT,            -- JSON array [{name, qualification, specialization}]
  timings           TEXT,            -- JSON {mon:[{open,close}], ...}
  registration_no   TEXT,
  language          TEXT NOT NULL DEFAULT 'en', -- 'en' | 'ur-roman'
  onboarding_done   INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name       TEXT NOT NULL,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'receptionist', -- admin | doctor | receptionist
  specialization  TEXT,
  qualification   TEXT,
  phone           TEXT,
  shift_notes     TEXT,
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date    TEXT NOT NULL DEFAULT (date('now')),
  note        TEXT,
  metric_key  TEXT,                  -- e.g. 'patients_seen', 'revenue_generated'
  metric_val  REAL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ───────────────────────────── Patients ─────────────────────────────

CREATE TABLE IF NOT EXISTS patients (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_code      TEXT NOT NULL UNIQUE,   -- e.g. SHF-00001
  full_name         TEXT NOT NULL,
  phone             TEXT,
  cnic              TEXT,
  gender            TEXT,                   -- male | female | other
  dob               TEXT,
  blood_group       TEXT,
  address           TEXT,
  guardian_name     TEXT,
  allergies         TEXT,
  chronic_conditions TEXT,
  medical_history   TEXT,
  notes             TEXT,
  active            INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_patients_name  ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_cnic  ON patients(cnic);

CREATE TABLE IF NOT EXISTS patient_visits (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  visit_date    TEXT NOT NULL DEFAULT (datetime('now')),
  visit_type    TEXT,                       -- consultation | follow-up | procedure ...
  vitals        TEXT,                       -- JSON {bp, temp, weight, height, pulse, spo2}
  complaint     TEXT,
  diagnosis     TEXT,
  treatment_plan TEXT,
  specialty_data TEXT,                      -- JSON: clinic-type-specific (tooth chart, session log, etc.)
  follow_up_date TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date    ON patient_visits(visit_date);

CREATE TABLE IF NOT EXISTS patient_attachments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id      INTEGER REFERENCES patient_visits(id) ON DELETE SET NULL,
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  category      TEXT,                       -- lab_report | xray | scan | other
  uploaded_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attachments_patient ON patient_attachments(patient_id);

-- ───────────────────────────── Appointments ─────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  appt_date     TEXT NOT NULL,               -- YYYY-MM-DD
  start_time    TEXT NOT NULL,               -- HH:MM (24h)
  end_time      TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'booked', -- booked | walk-in
  status        TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | checked-in | in-progress | completed | cancelled | no-show
  reason        TEXT,
  notes         TEXT,
  queue_no      INTEGER,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appt_date   ON appointments(appt_date);
CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctor_id, appt_date);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);

-- ───────────────────────────── Billing ─────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no      TEXT NOT NULL UNIQUE,      -- e.g. INV-2026-00001
  patient_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id  INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  visit_id        INTEGER REFERENCES patient_visits(id) ON DELETE SET NULL,
  invoice_date    TEXT NOT NULL DEFAULT (date('now')),
  subtotal        REAL NOT NULL DEFAULT 0,
  discount        REAL NOT NULL DEFAULT 0,
  tax             REAL NOT NULL DEFAULT 0,
  total           REAL NOT NULL DEFAULT 0,
  paid_amount     REAL NOT NULL DEFAULT 0,
  due_amount      REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'unpaid', -- unpaid | partial | paid | void
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date    ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id   INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  quantity     REAL NOT NULL DEFAULT 1,
  unit_price   REAL NOT NULL DEFAULT 0,
  total        REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id   INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount       REAL NOT NULL,
  mode         TEXT NOT NULL DEFAULT 'cash',  -- cash | card | online | bank
  reference    TEXT,
  paid_at      TEXT NOT NULL DEFAULT (datetime('now')),
  recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date    ON payments(paid_at);

-- ───────────────────────────── Prescriptions ─────────────────────────────

CREATE TABLE IF NOT EXISTS drugs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  generic_name  TEXT,
  category      TEXT,
  common_dosage TEXT,
  common_form   TEXT                          -- tablet | syrup | injection | cream ...
);
CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs(name);

CREATE TABLE IF NOT EXISTS prescriptions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_no TEXT NOT NULL UNIQUE,
  patient_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  visit_id        INTEGER REFERENCES patient_visits(id) ON DELETE SET NULL,
  presc_date      TEXT NOT NULL DEFAULT (date('now')),
  diagnosis       TEXT,
  advice          TEXT,
  follow_up_date  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_presc_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_presc_date    ON prescriptions(presc_date);

CREATE TABLE IF NOT EXISTS prescription_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  drug_name       TEXT NOT NULL,
  dosage          TEXT,
  frequency       TEXT,                       -- e.g. "1-0-1"
  duration        TEXT,                       -- e.g. "5 days"
  instructions    TEXT,                       -- e.g. "after meals"
  sort_order      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_presc_items_presc ON prescription_items(prescription_id);

-- ───────────────────────────── Lab & Diagnostics ─────────────────────────────

CREATE TABLE IF NOT EXISTS lab_orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no        TEXT NOT NULL UNIQUE,
  patient_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  visit_id        INTEGER REFERENCES patient_visits(id) ON DELETE SET NULL,
  test_name       TEXT NOT NULL,
  lab_name        TEXT,
  order_date      TEXT NOT NULL DEFAULT (date('now')),
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | sample-collected | completed | cancelled
  result_summary  TEXT,
  result_file_path TEXT,
  completed_date  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lab_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_status  ON lab_orders(status);

-- ───────────────────────────── Inventory ─────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  category        TEXT,                        -- medicine | consumable | equipment
  unit            TEXT NOT NULL DEFAULT 'pcs',  -- pcs | box | bottle | strip
  quantity        REAL NOT NULL DEFAULT 0,
  reorder_level   REAL NOT NULL DEFAULT 10,
  unit_price      REAL NOT NULL DEFAULT 0,
  supplier_id     INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  expiry_date     TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items(name);

CREATE TABLE IF NOT EXISTS stock_movements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id         INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type   TEXT NOT NULL,               -- in | out | adjustment
  quantity        REAL NOT NULL,
  reason          TEXT,
  reference       TEXT,
  moved_at        TEXT NOT NULL DEFAULT (datetime('now')),
  recorded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_stock_moves_item ON stock_movements(item_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  po_no           TEXT NOT NULL UNIQUE,
  supplier_id     INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date      TEXT NOT NULL DEFAULT (date('now')),
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | received | cancelled
  total_amount    REAL NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id           INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id         INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name       TEXT NOT NULL,
  quantity        REAL NOT NULL DEFAULT 1,
  unit_price      REAL NOT NULL DEFAULT 0,
  total           REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(po_id);

-- ───────────────────────────── Financial & Reports ─────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  category        TEXT NOT NULL,                -- rent | salaries | utilities | supplies | other
  description     TEXT,
  amount          REAL NOT NULL,
  expense_date    TEXT NOT NULL DEFAULT (date('now')),
  recorded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- ───────────────────────────── Communication ─────────────────────────────

CREATE TABLE IF NOT EXISTS communication_templates (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'reminder', -- reminder | follow-up | birthday | promo
  language      TEXT NOT NULL DEFAULT 'roman-ur', -- 'en' | 'roman-ur'
  body          TEXT NOT NULL,                    -- supports {{patient_name}}, {{date}}, {{time}}, {{clinic_name}} tokens
  is_default    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS communication_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  template_id   INTEGER REFERENCES communication_templates(id) ON DELETE SET NULL,
  channel       TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp | sms
  message       TEXT NOT NULL,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'opened',   -- opened | sent | failed  (wa.me can only confirm "opened")
  sent_at       TEXT NOT NULL DEFAULT (datetime('now')),
  sent_by       INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_comm_log_patient ON communication_log(patient_id);

-- ───────────────────────────── Licensing ─────────────────────────────

CREATE TABLE IF NOT EXISTS license (
  id              INTEGER PRIMARY KEY CHECK (id = 1), -- singleton
  license_key     TEXT,
  tier            TEXT NOT NULL DEFAULT 'trial', -- trial | monthly | lifetime
  issued_to       TEXT,
  activated_at    TEXT,
  trial_started_at TEXT,
  expiry          TEXT,                          -- null for lifetime
  payload_json    TEXT,                          -- raw decoded payload for audit
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
