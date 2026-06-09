import { useState } from 'react'
import { Building2, ShieldCheck, DatabaseBackup, Download, Upload, Sparkles, CheckCircle2, AlertTriangle, Clock, Phone } from 'lucide-react'
import { PageHeader, Badge, LoadingScreen } from '../../components/Misc'
import { Card } from '../../components/Card'
import Button from '../../components/Button'
import { TextField } from '../../components/Field'
import ClinicProfileForm from './ClinicProfileForm'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { SUPPORT_PHONE, SUPPORT_WA_URL } from '../../lib/support'

const TABS = [
  { id: 'profile', label: 'Clinic Profile', icon: Building2 },
  { id: 'license', label: 'License & Subscription', icon: ShieldCheck },
  { id: 'data', label: 'Data & Backup', icon: DatabaseBackup },
]

const TIER_LABELS = { trial: 'Free Trial', monthly: 'Monthly Plan', lifetime: 'Lifetime License' }

function LicensePanel({ license, onLicenseChanged }) {
  const [key, setKey] = useState('')
  const [activating, setActivating] = useState(false)
  const [message, setMessage] = useState(null)

  if (!license) return <LoadingScreen label="Checking your license…" />

  const isActive = license.state === 'active'
  const isTrial = license.tier === 'trial'

  async function handleActivate(e) {
    e.preventDefault()
    if (!key.trim()) return
    setActivating(true)
    setMessage(null)
    try {
      const res = await api.license.activate(key.trim())
      if (res?.ok) {
        setMessage({ tone: 'success', text: 'Your license was activated successfully. Thank you for choosing Shifa Suite!' })
        setKey('')
        onLicenseChanged?.()
      } else {
        setMessage({ tone: 'error', text: res?.reason === 'bad-signature' ? `This license key is not valid. Please check it and try again, or WhatsApp us on ${SUPPORT_PHONE}.` : `Could not activate this key. Please check it and try again, or WhatsApp us on ${SUPPORT_PHONE}.` })
      }
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Could not activate this key.' })
    } finally {
      setActivating(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card className={isActive ? 'border-[#cdeee2] bg-[#f3fbf8]' : 'border-[#fbe3cf] bg-[#fef8f2]'}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-white text-[var(--color-success)]' : 'bg-white text-[var(--color-accent)]'}`}>
            {isActive ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold font-[family-name:var(--font-heading)]">
              {TIER_LABELS[license.tier] || license.tier} · <Badge tone={isActive ? 'success' : 'warning'}>{isActive ? 'Active' : 'Expired'}</Badge>
            </p>
            <p className="text-sm text-black/55 mt-0.5">
              {isTrial
                ? `${license.daysRemaining > 0 ? `${license.daysRemaining} day${license.daysRemaining === 1 ? '' : 's'} left in your free trial` : 'Your free trial has ended'} — activate a license key to keep using Shifa Suite without interruption.`
                : isActive
                  ? `Licensed to ${license.issuedTo || 'this clinic'} · valid until ${license.expiry ? formatDate(license.expiry) : 'no expiry (lifetime)'}`
                  : `Your ${TIER_LABELS[license.tier] || license.tier} expired on ${license.expiry ? formatDate(license.expiry) : '—'}. Renew to continue using Shifa Suite.`}
            </p>
          </div>
          {isActive && !isTrial ? null : <Clock className="text-black/20 shrink-0" size={28} />}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-1">Activate or Renew License</h3>
        <p className="text-sm text-black/45 mb-4">Enter the license key you received after purchase. Activation works fully offline — no internet connection required.</p>
        <form onSubmit={handleActivate} className="flex flex-col sm:flex-row sm:items-end gap-3">
          <TextField
            label="License Key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="SHIFA-XXXXX-XXXXX-XXXXX-XXXXX"
            className="flex-1 font-mono"
          />
          <Button type="submit" variant="primary" disabled={activating || !key.trim()}>{activating ? 'Activating…' : 'Activate License'}</Button>
        </form>
        {message ? (
          <p className={`text-sm font-medium mt-3 ${message.tone === 'success' ? 'text-[var(--color-success)]' : 'text-[var(--color-warning-error)]'}`}>{message.text}</p>
        ) : null}
      </Card>

      <Card className="bg-[var(--color-secondary)]/40 border-transparent">
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-white text-[var(--color-primary)] flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">Need a license, or have a question about billing?</p>
            <p className="text-sm text-black/55 mt-1">
              Monthly Plan — Rs. 1,200/month · Lifetime License — Rs. 12,000 one-time. Message us on WhatsApp and we'll get you set up within minutes.
            </p>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-success)] mt-1">
              <Phone size={13} /> {SUPPORT_PHONE}
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => api.app.openExternal(SUPPORT_WA_URL)}>Contact on WhatsApp</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function DataPanel() {
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState(null)

  async function handleBackup() {
    setBusy('backup')
    setMessage(null)
    try {
      const res = await api.settings.backupDatabase()
      if (res?.ok) setMessage({ tone: 'success', text: `Backup saved successfully${res.path ? ` to ${res.path}` : ''}.` })
      else if (!res?.canceled) setMessage({ tone: 'error', text: 'Could not create a backup. Please try again.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Could not create a backup.' })
    } finally {
      setBusy('')
    }
  }

  async function handleRestore() {
    setBusy('restore')
    setMessage(null)
    try {
      const res = await api.settings.restoreDatabase()
      if (res?.ok) setMessage({ tone: 'success', text: 'Your data was restored. Shifa Suite will now restart.' })
      else if (!res?.canceled) setMessage({ tone: 'error', text: 'Could not restore from this backup file.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Could not restore from this backup file.' })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-1">Backup Your Clinic Data</h3>
        <p className="text-sm text-black/45 mb-4">
          Everything in Shifa Suite — patients, appointments, prescriptions, billing and inventory — is stored privately on this computer. Take regular backups and keep a copy somewhere safe (a USB drive or cloud folder).
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-black/5 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#e9fbe7] text-[var(--color-success)] flex items-center justify-center shrink-0">
              <Download size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Backup Now</p>
              <p className="text-xs text-black/45 mt-0.5 mb-3">Save a complete copy of your clinic database to a file you choose.</p>
              <Button size="sm" variant="primary" onClick={handleBackup} disabled={!!busy}>{busy === 'backup' ? 'Saving Backup…' : 'Create Backup'}</Button>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-black/5 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#fdecdd] text-[var(--color-accent)] flex items-center justify-center shrink-0">
              <Upload size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Restore from Backup</p>
              <p className="text-xs text-black/45 mt-0.5 mb-3">Replace current data with a previously saved backup file. Shifa Suite will restart.</p>
              <Button size="sm" variant="outline" onClick={handleRestore} disabled={!!busy}>{busy === 'restore' ? 'Restoring…' : 'Restore Backup'}</Button>
            </div>
          </div>
        </div>
        {message ? (
          <p className={`text-sm font-medium mt-4 ${message.tone === 'success' ? 'text-[var(--color-success)]' : 'text-[var(--color-warning-error)]'}`}>{message.text}</p>
        ) : null}
      </Card>

      <Card className="bg-[var(--color-secondary)]/40 border-transparent flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-white text-[var(--color-primary)] flex items-center justify-center shrink-0">
          <ShieldCheck size={18} />
        </div>
        <p className="text-sm text-black/55">
          Your data never leaves this computer unless you choose to back it up or share it. Shifa Suite works fully offline, so your patients' information always stays private and under your control.
        </p>
      </Card>
    </div>
  )
}

export default function Settings({ clinic, license, onClinicSaved, onLicenseChanged }) {
  const [tab, setTab] = useState('profile')

  return (
    <div>
      <PageHeader
        title="Admin & Settings"
        titleUrdu="Sohlat — Clinic Setup"
        subtitle="Manage your clinic profile, license and data — everything that keeps Shifa Suite working the way your clinic needs."
      />

      <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-black/5 mb-5">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${tab === t.id ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-black/50 hover:text-black/70'}`}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'profile' ? (
        clinic ? <ClinicProfileForm clinic={clinic} onSaved={onClinicSaved} /> : <LoadingScreen label="Loading your clinic profile…" />
      ) : tab === 'license' ? (
        <LicensePanel license={license} onLicenseChanged={onLicenseChanged} />
      ) : (
        <DataPanel />
      )}
    </div>
  )
}
