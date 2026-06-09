import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Wrench } from 'lucide-react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea } from '../../components/Field'
import { api } from '../../lib/api'

const TYPES = [
  { value: 'in', label: 'Stock In', sub: 'New stock received', icon: ArrowDownToLine, tone: 'success' },
  { value: 'out', label: 'Stock Out', sub: 'Used, sold or wasted', icon: ArrowUpFromLine, tone: 'danger' },
  { value: 'adjustment', label: 'Correction', sub: 'Fix a counting mistake', icon: Wrench, tone: 'primary' },
]

export default function StockAdjustModal({ open, onClose, item, onSaved }) {
  const [movementType, setMovementType] = useState('in')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setMovementType('in'); setQuantity(''); setReason(''); setError('') }
  }, [open, item])

  async function handleSubmit(e) {
    e.preventDefault()
    const qty = Number(quantity)
    if (!qty || qty <= 0) { setError('Please enter a quantity greater than zero.'); return }
    if (movementType === 'out' && qty > Number(item.quantity)) {
      setError(`Only ${item.quantity} ${item.unit} currently in stock.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = await api.inventory.adjustStock({
        item_id: item.id,
        movement_type: movementType,
        quantity: qty,
        reason: reason.trim() || null,
      })
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not record this stock movement.')
    } finally {
      setSaving(false)
    }
  }

  if (!item) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Adjust Stock — ${item.name}`}
      subtitle={`Stock Tabdeeli — currently ${item.quantity} ${item.unit} in hand`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Record Movement'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-2.5">
          {TYPES.map((t) => {
            const Icon = t.icon
            const active = movementType === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setMovementType(t.value)}
                className={`text-left p-3 rounded-xl border-2 transition-colors ${active ? 'border-[var(--color-primary)] bg-[var(--color-secondary)]/60' : 'border-black/5 hover:border-black/10'}`}
              >
                <Icon size={18} className={active ? 'text-[var(--color-primary)]' : 'text-black/40'} />
                <p className="font-semibold text-sm mt-1.5">{t.label}</p>
                <p className="text-xs text-black/40">{t.sub}</p>
              </button>
            )
          })}
        </div>

        <TextField
          label={`Quantity (${item.unit})`}
          required
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
        />

        <TextArea
          label="Reason / Reference (optional)"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={movementType === 'in' ? 'e.g. Purchased from Al-Shifa Pharma — Invoice #2241' : movementType === 'out' ? 'e.g. Used during patient visits today' : 'e.g. Recount after stock-take'}
        />

        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
