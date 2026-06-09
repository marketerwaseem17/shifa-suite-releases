const crypto = require('node:crypto')

// Public half of the Ed25519 keypair used to sign license keys.
// The matching private key lives ONLY in tools/keygen/ (never shipped with the app)
// and is used to issue keys for paying customers.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAtmLa48VxrGQ0DjNyqe2RHWJGn5r4QZYfVm6yWl+pBmY=
-----END PUBLIC KEY-----`

const TRIAL_DAYS = 7
const TIERS = ['trial', 'monthly', 'lifetime']

function publicKey() {
  return crypto.createPublicKey(PUBLIC_KEY_PEM)
}

function b64urlToBuf(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/**
 * License key format: "<base64url(payload-json)>.<base64url(ed25519-signature)>"
 * Payload: { tier, issuedTo, issuedAt (ISO), expiry (ISO|null), v: 1 }
 */
function decodeLicenseKey(key) {
  if (typeof key !== 'string' || !key.includes('.')) return { valid: false, reason: 'malformed' }
  const [payloadB64, sigB64] = key.trim().split('.')
  if (!payloadB64 || !sigB64) return { valid: false, reason: 'malformed' }

  let payloadBuf
  try {
    payloadBuf = b64urlToBuf(payloadB64)
  } catch {
    return { valid: false, reason: 'malformed' }
  }

  let signatureValid = false
  try {
    signatureValid = crypto.verify(null, payloadBuf, publicKey(), b64urlToBuf(sigB64))
  } catch {
    signatureValid = false
  }
  if (!signatureValid) return { valid: false, reason: 'bad-signature' }

  let payload
  try {
    payload = JSON.parse(payloadBuf.toString('utf-8'))
  } catch {
    return { valid: false, reason: 'malformed' }
  }
  if (!payload || !TIERS.includes(payload.tier)) return { valid: false, reason: 'malformed' }

  return { valid: true, payload }
}

function daysBetween(fromIso, toIso) {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime()
  return Math.ceil(ms / 86400000)
}

/**
 * Resolves the current license status purely from local DB state — no
 * network access required. Returns a status object the renderer can use
 * to gate features and render the license screen / trial countdown.
 */
function getLicenseStatus(db) {
  const row = db.prepare('SELECT * FROM license WHERE id = 1').get()
  const now = new Date().toISOString()

  if (!row) {
    return { tier: 'trial', state: 'active', daysRemaining: TRIAL_DAYS, expiry: null }
  }

  if (row.tier === 'lifetime' && row.activated_at) {
    return { tier: 'lifetime', state: 'active', daysRemaining: null, expiry: null, issuedTo: row.issued_to }
  }

  if (row.tier === 'monthly' && row.activated_at) {
    if (!row.expiry) return { tier: 'monthly', state: 'active', daysRemaining: null, expiry: null }
    const remaining = daysBetween(now, row.expiry)
    if (remaining < 0) return { tier: 'monthly', state: 'expired', daysRemaining: 0, expiry: row.expiry, issuedTo: row.issued_to }
    return { tier: 'monthly', state: 'active', daysRemaining: remaining, expiry: row.expiry, issuedTo: row.issued_to }
  }

  // Trial
  const start = row.trial_started_at || now
  const remaining = TRIAL_DAYS - daysBetween(start, now)
  if (remaining <= 0) return { tier: 'trial', state: 'expired', daysRemaining: 0, expiry: null }
  return { tier: 'trial', state: 'active', daysRemaining: remaining, expiry: null }
}

/**
 * Validates and stores a license key against the local DB. Locking on
 * expiry never deletes data — it only changes the status returned above,
 * which the renderer uses to show an upgrade screen instead of the app.
 */
function activateLicenseKey(db, rawKey) {
  const decoded = decodeLicenseKey(rawKey)
  if (!decoded.valid) {
    return { ok: false, reason: decoded.reason }
  }
  const { payload } = decoded

  db.prepare(`
    INSERT INTO license (id, license_key, tier, issued_to, activated_at, trial_started_at, expiry, payload_json, updated_at)
    VALUES (1, @license_key, @tier, @issued_to, datetime('now'), COALESCE((SELECT trial_started_at FROM license WHERE id = 1), datetime('now')), @expiry, @payload_json, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      license_key = excluded.license_key,
      tier = excluded.tier,
      issued_to = excluded.issued_to,
      activated_at = excluded.activated_at,
      expiry = excluded.expiry,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `).run({
    license_key: rawKey.trim(),
    tier: payload.tier,
    issued_to: payload.issuedTo || null,
    expiry: payload.expiry || null,
    payload_json: JSON.stringify(payload),
  })

  return { ok: true, status: getLicenseStatus(db) }
}

module.exports = { getLicenseStatus, activateLicenseKey, decodeLicenseKey, TRIAL_DAYS }
