import { useState } from 'react'
import { ShieldAlert, MessageCircle } from 'lucide-react'
import Button from './Button'
import { Card } from './Card'
import { TextField } from './Field'
import { api } from '../lib/api'
import { SUPPORT_PHONE, SUPPORT_WA_URL } from '../lib/support'

/**
 * Shown instead of the app when the trial/subscription has lapsed.
 * Data is never touched — activating a key (or letting the trial resume
 * if the clock was rolled back) simply unlocks the existing database again.
 */
export default function LicenseGate({ license, onActivated }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isTrial = license?.tier === 'trial'

  async function handleActivate(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await api.license.activate(key.trim())
      if (!res.ok) {
        setError(
          res.reason === 'bad-signature'
            ? `This license key is not valid. Please check it and try again, or WhatsApp us on ${SUPPORT_PHONE}.`
            : 'This license key looks malformed. Please paste it exactly as provided.'
        )
        return
      }
      onActivated?.(res.status)
    } catch (err) {
      setError(err.message || 'Could not activate this key.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-secondary)] p-6">
      <Card className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#fbe7e7] text-[var(--color-warning-error)] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={30} />
        </div>
        <h1 className="text-xl font-bold font-[family-name:var(--font-heading)]">
          {isTrial ? 'Your free trial has ended' : 'Your subscription has expired'}
        </h1>
        <p className="text-sm text-black/55 mt-2 max-w-sm mx-auto">
          {isTrial
            ? 'Your 7-day free trial of Shifa Suite has finished. Your patient records and data are completely safe — activate a license to keep using the app.'
            : 'Your monthly plan has ended. Your data is safe and untouched — renew to continue using Shifa Suite.'}
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-black/10 p-4">
            <p className="font-semibold text-sm">Monthly Plan</p>
            <p className="text-2xl font-bold text-[var(--color-primary)] mt-1">Rs. 1,200<span className="text-sm font-normal text-black/40">/month</span></p>
          </div>
          <div className="rounded-xl border-2 border-[var(--color-accent)] p-4 relative">
            <span className="absolute -top-2.5 right-3 bg-[var(--color-accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">BEST VALUE</span>
            <p className="font-semibold text-sm">Lifetime License</p>
            <p className="text-2xl font-bold text-[var(--color-accent)] mt-1">Rs. 12,000<span className="text-sm font-normal text-black/40"> one-time</span></p>
          </div>
        </div>

        <form onSubmit={handleActivate} className="mt-6 text-left">
          <TextField
            label="Have a license key?"
            placeholder="Paste your Shifa Suite license key here"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            error={error}
          />
          <Button type="submit" variant="primary" className="w-full mt-3" disabled={busy || !key.trim()}>
            {busy ? 'Activating…' : 'Activate License'}
          </Button>
        </form>

        <button
          onClick={() => api.app.openExternal(SUPPORT_WA_URL)}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium mt-5 hover:underline"
        >
          <MessageCircle size={15} /> WhatsApp us to activate: {SUPPORT_PHONE}
        </button>
      </Card>
    </div>
  )
}
