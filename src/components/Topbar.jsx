import { Link } from 'react-router-dom'
import { Clock3, Crown, AlertTriangle } from 'lucide-react'

function LicenseBadge({ license }) {
  if (!license) return null

  if (license.tier === 'lifetime') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#fdf1e2] text-[var(--color-accent-dark)]">
        <Crown size={14} /> Lifetime License
      </span>
    )
  }

  if (license.state === 'expired') {
    return (
      <Link
        to="/settings?tab=license"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#fbe7e7] text-[var(--color-warning-error)] hover:opacity-80"
      >
        <AlertTriangle size={14} />
        {license.tier === 'trial' ? 'Trial expired — Activate now' : 'Subscription expired — Renew now'}
      </Link>
    )
  }

  if (license.tier === 'trial') {
    return (
      <Link
        to="/settings?tab=license"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-secondary)] text-[var(--color-primary-dark)] hover:opacity-80"
      >
        <Clock3 size={14} /> Free trial — {license.daysRemaining} day{license.daysRemaining === 1 ? '' : 's'} left
      </Link>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e3f6ea] text-[var(--color-success)]">
      <Clock3 size={14} /> Monthly plan — {license.daysRemaining} day{license.daysRemaining === 1 ? '' : 's'} left
    </span>
  )
}

export default function Topbar({ title, license, user }) {
  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <header className="h-16 shrink-0 bg-white border-b border-black/5 flex items-center justify-between px-6 gap-4">
      <div>
        <h2 className="font-semibold font-[family-name:var(--font-heading)] text-[var(--color-text)]">{title}</h2>
        <p className="text-xs text-black/40">{today}</p>
      </div>
      <div className="flex items-center gap-3">
        <LicenseBadge license={license} />
        {user ? (
          <div className="flex items-center gap-2.5 pl-3 border-l border-black/8">
            <div className="w-9 h-9 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center font-semibold text-sm">
              {user.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{user.full_name}</p>
              <p className="text-xs text-black/40 capitalize">{user.role}</p>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
