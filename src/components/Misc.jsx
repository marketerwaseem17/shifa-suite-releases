export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-black/5 text-black/55',
    primary: 'bg-[var(--color-secondary)] text-[var(--color-primary-dark)]',
    success: 'bg-[#e3f6ea] text-[var(--color-success)]',
    warning: 'bg-[#fdf1e2] text-[var(--color-accent-dark)]',
    danger: 'bg-[#fbe7e7] text-[var(--color-warning-error)]',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function PageHeader({ title, titleUrdu, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-text)]">
          {title}
          {titleUrdu ? <span className="text-black/35 font-medium text-xl"> · {titleUrdu}</span> : null}
        </h1>
        {subtitle ? <p className="text-sm text-black/45 mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3 flex-wrap">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon ? (
        <div className="w-16 h-16 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center mb-4">
          <Icon size={28} />
        </div>
      ) : null}
      <h3 className="font-semibold text-lg font-[family-name:var(--font-heading)]">{title}</h3>
      {message ? <p className="text-sm text-black/45 mt-1.5 max-w-sm">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
      aria-label="Loading"
    />
  )
}

export function LoadingScreen({ label = 'Loading Shifa Suite…' }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-primary)]">
      <Spinner className="w-8 h-8" />
      <p className="text-sm text-black/40">{label}</p>
    </div>
  )
}
