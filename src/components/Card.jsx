export function Card({ children, className = '', padded = true, ...props }) {
  return (
    <div
      className={`bg-white rounded-[var(--radius-card)] border border-black/5
        shadow-[var(--shadow-card)] ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function StatCard({ label, value, hint, icon: Icon, accent = 'primary' }) {
  const accentClasses = {
    primary: 'bg-[var(--color-secondary)] text-[var(--color-primary)]',
    accent: 'bg-[#fdecdd] text-[var(--color-accent)]',
    success: 'bg-[#e3f6ea] text-[var(--color-success)]',
    danger: 'bg-[#fbe7e7] text-[var(--color-warning-error)]',
  }
  return (
    <Card className="flex items-center gap-4">
      {Icon ? (
        <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${accentClasses[accent]}`}>
          <Icon size={22} />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-sm text-black/50 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-text)] tabular-nums">
          {value}
        </p>
        {hint ? <p className="text-xs text-black/40 mt-0.5">{hint}</p> : null}
      </div>
    </Card>
  )
}
