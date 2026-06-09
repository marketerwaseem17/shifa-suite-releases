#!/usr/bin/env node
/**
 * Shifa Suite — internal license keygen tool.
 *
 * Generates signed offline license keys for paying customers. The private
 * key in keys/private.pem is the crown jewels of this tool — keep it out of
 * version control and off any machine that ships to customers. Only
 * keys/public.pem (already embedded in electron/license/license.cjs) goes
 * into the product.
 *
 * Usage:
 *   node generate-license.js --tier lifetime --customer "Dr. Ali Raza, City Clinic"
 *   node generate-license.js --tier monthly  --customer "Dr. Sana Khan" --months 1
 *   node generate-license.js --tier trial    --customer "Demo - ABC Clinic"
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const KEYS_DIR = path.join(__dirname, 'keys')
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem')
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem')

function ensureKeypair() {
  fs.mkdirSync(KEYS_DIR, { recursive: true })
  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) return

  console.log('No keypair found — generating a new Ed25519 signing keypair...')
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey.export({ type: 'pkcs8', format: 'pem' }))
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey.export({ type: 'spki', format: 'pem' }))
  console.log('\n⚠️  IMPORTANT: paste this PUBLIC key into electron/license/license.cjs (PUBLIC_KEY_PEM):\n')
  console.log(publicKey.export({ type: 'spki', format: 'pem' }).toString())
  console.log('Keep keys/private.pem secret — anyone holding it can mint valid licenses.\n')
}

function bufToB64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function parseArgs(argv) {
  const args = { tier: 'lifetime', customer: 'Unknown Customer', months: 1, days: 7 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--tier') args.tier = argv[++i]
    else if (a === '--customer') args.customer = argv[++i]
    else if (a === '--months') args.months = parseInt(argv[++i], 10)
    else if (a === '--days') args.days = parseInt(argv[++i], 10)
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!['trial', 'monthly', 'lifetime'].includes(args.tier)) {
    console.error(`Unknown tier "${args.tier}". Use one of: trial | monthly | lifetime`)
    process.exit(1)
  }

  ensureKeypair()
  const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8'))

  const issuedAt = new Date()
  let expiry = null
  if (args.tier === 'monthly') {
    const exp = new Date(issuedAt)
    exp.setMonth(exp.getMonth() + (args.months || 1))
    expiry = exp.toISOString()
  } else if (args.tier === 'trial') {
    const exp = new Date(issuedAt)
    exp.setDate(exp.getDate() + (args.days || 7))
    expiry = exp.toISOString()
  }
  // lifetime → expiry stays null

  const payload = {
    v: 1,
    tier: args.tier,
    issuedTo: args.customer,
    issuedAt: issuedAt.toISOString(),
    expiry,
  }

  const payloadBuf = Buffer.from(JSON.stringify(payload), 'utf-8')
  const signature = crypto.sign(null, payloadBuf, privateKey)
  const licenseKey = `${bufToB64url(payloadBuf)}.${bufToB64url(signature)}`

  console.log('\n──────────────────────────────────────────────')
  console.log(`Tier:       ${payload.tier}`)
  console.log(`Issued to:  ${payload.issuedTo}`)
  console.log(`Issued at:  ${payload.issuedAt}`)
  console.log(`Expiry:     ${payload.expiry || 'never (lifetime)'}`)
  console.log('──────────────────────────────────────────────')
  console.log('LICENSE KEY (give this to the customer):\n')
  console.log(licenseKey)
  console.log('')
}

main()
