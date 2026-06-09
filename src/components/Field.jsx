const baseControl = `w-full rounded-[var(--radius-control)] border border-black/15 bg-white px-3.5 py-2.5
  text-[15px] text-[var(--color-text)] placeholder:text-black/35
  focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 outline-none
  disabled:bg-black/5 disabled:cursor-not-allowed transition-colors`

function Wrapper({ label, hint, error, required, children, labelUrdu }) {
  return (
    <label className="block">
      {label ? (
        <span className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
          {label}
          {labelUrdu ? <span className="text-black/40 font-normal"> / {labelUrdu}</span> : null}
          {required ? <span className="text-[var(--color-warning-error)]"> *</span> : null}
        </span>
      ) : null}
      {children}
      {hint && !error ? <span className="block text-xs text-black/40 mt-1">{hint}</span> : null}
      {error ? <span className="block text-xs text-[var(--color-warning-error)] mt-1 font-medium">{error}</span> : null}
    </label>
  )
}

export function TextField({ label, labelUrdu, hint, error, className = '', ...props }) {
  return (
    <Wrapper label={label} labelUrdu={labelUrdu} hint={hint} error={error} required={props.required}>
      <input className={`${baseControl} ${error ? '!border-[var(--color-warning-error)]' : ''} ${className}`} {...props} />
    </Wrapper>
  )
}

export function TextArea({ label, labelUrdu, hint, error, className = '', rows = 3, ...props }) {
  return (
    <Wrapper label={label} labelUrdu={labelUrdu} hint={hint} error={error} required={props.required}>
      <textarea
        rows={rows}
        className={`${baseControl} resize-y ${error ? '!border-[var(--color-warning-error)]' : ''} ${className}`}
        {...props}
      />
    </Wrapper>
  )
}

export function SelectField({ label, labelUrdu, hint, error, options = [], placeholder, className = '', ...props }) {
  return (
    <Wrapper label={label} labelUrdu={labelUrdu} hint={hint} error={error} required={props.required}>
      <select className={`${baseControl} ${error ? '!border-[var(--color-warning-error)]' : ''} ${className}`} {...props}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>{opt}</option>
          ) : (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )
        )}
      </select>
    </Wrapper>
  )
}

export function Checkbox({ label, labelUrdu, className = '', ...props }) {
  return (
    <label className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
      <input
        type="checkbox"
        className="w-5 h-5 rounded border-black/25 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
        {...props}
      />
      <span className="text-[15px] text-[var(--color-text)]">
        {label} {labelUrdu ? <span className="text-black/40">/ {labelUrdu}</span> : null}
      </span>
    </label>
  )
}
