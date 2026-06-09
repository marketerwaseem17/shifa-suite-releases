import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../lib/api'
import { initialsOf } from '../lib/format'

/**
 * Typeahead patient search used across Appointments, Billing, Prescriptions and Lab —
 * keeps the "find the right patient fast" interaction consistent everywhere.
 */
export default function PatientPicker({ patient, onChange, label = 'Patient', required = true }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(() => {
      api.patients.list({ search: query, page: 1, pageSize: 8 }).then((res) => setResults(res.rows))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div>
      {label ? (
        <span className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
          {label} {required ? <span className="text-[var(--color-warning-error)]">*</span> : null}
        </span>
      ) : null}

      {patient ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-black/10 bg-[var(--color-secondary)]/40">
          <div className="w-10 h-10 rounded-full bg-white text-[var(--color-primary)] flex items-center justify-center font-semibold shrink-0">
            {initialsOf(patient.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{patient.full_name}</p>
            <p className="text-xs text-black/40">{patient.patient_code} {patient.phone ? `· ${patient.phone}` : ''}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} className="p-1.5 rounded-lg text-black/35 hover:bg-black/5 hover:text-black/60">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative" ref={boxRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30" />
            <input
              className="w-full rounded-[var(--radius-control)] border border-black/15 bg-white pl-10 pr-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="Search patient by name, phone, CNIC or ID…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
            />
          </div>
          {open && results.length ? (
            <div className="absolute z-10 mt-1.5 w-full bg-white rounded-xl border border-black/10 shadow-lg max-h-64 overflow-y-auto">
              {results.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => { onChange(p); setOpen(false); setQuery('') }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[var(--color-secondary)]/50 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center text-xs font-semibold shrink-0">
                    {initialsOf(p.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.full_name}</p>
                    <p className="text-xs text-black/40">{p.patient_code} {p.phone ? `· ${p.phone}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          {open && query.trim() && !results.length ? (
            <div className="absolute z-10 mt-1.5 w-full bg-white rounded-xl border border-black/10 shadow-lg p-4 text-center text-sm text-black/40">
              No matching patients. Try a different search, or register them first from Patient Management.
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
