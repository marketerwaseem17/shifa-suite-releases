const VARIANTS = {
  primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] shadow-sm',
  accent: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-dark)] shadow-sm',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-primary-dark)] hover:bg-[#d8ecef] border border-[var(--color-primary-light)]/40',
  ghost: 'bg-transparent text-[var(--color-text)] hover:bg-black/5',
  danger: 'bg-[var(--color-warning-error)] text-white hover:bg-[#d64545] shadow-sm',
  outline: 'bg-white text-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-[var(--color-secondary)]',
}

const SIZES = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-[15px] px-4 py-2.5 gap-2',
  lg: 'text-base px-6 py-3.5 gap-2.5',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold rounded-[var(--radius-control)]
        font-[family-name:var(--font-heading)] transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {Icon ? <Icon size={size === 'lg' ? 20 : 18} /> : null}
      {children}
      {IconRight ? <IconRight size={size === 'lg' ? 20 : 18} /> : null}
    </button>
  )
}
