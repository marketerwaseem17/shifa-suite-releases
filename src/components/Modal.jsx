import { useEffect } from 'react'
import { X } from 'lucide-react'

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

export default function Modal({ open, onClose, title, subtitle, size = 'md', children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full ${SIZES[size]} bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-black/5">
          <div>
            <h2 className="text-lg font-semibold font-[family-name:var(--font-heading)]">{title}</h2>
            {subtitle ? <p className="text-sm text-black/45 mt-0.5">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-black/40 hover:bg-black/5 hover:text-black/70 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer ? <div className="px-6 py-4 border-t border-black/5 flex items-center justify-end gap-3 bg-black/[0.02]">{footer}</div> : null}
      </div>
    </div>
  )
}
