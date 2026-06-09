import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

/**
 * Forgiving confirmation before destructive actions (e.g. deleting a patient
 * record) — a hard UX requirement so receptionists never lose data by accident.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Yes, continue',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${danger ? 'bg-[#fbe7e7] text-[var(--color-warning-error)]' : 'bg-[var(--color-secondary)] text-[var(--color-primary)]'}`}>
          <AlertTriangle size={28} />
        </div>
        <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)]">{title}</h3>
        {message ? <p className="text-sm text-black/55 max-w-sm">{message}</p> : null}
        <div className="flex items-center gap-3 mt-3 w-full justify-center">
          <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
