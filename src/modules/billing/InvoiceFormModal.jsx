import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, SelectField, TextArea } from '../../components/Field'
import PatientPicker from '../../components/PatientPicker'
import { api } from '../../lib/api'
import { formatMoney, todayISO } from '../../lib/format'

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online / Bank Transfer' },
  { value: 'bank', label: 'Bank Deposit' },
]

const QUICK_ITEMS = ['Consultation Fee', 'Follow-up Fee', 'Dressing & Medicine', 'Procedure Charges']

const emptyItem = () => ({ description: '', quantity: 1, unit_price: '' })

function emptyForm() {
  return {
    patient: null, invoice_date: todayISO(), discount: '', tax: '', notes: '',
    items: [emptyItem()], collectNow: true, paid_amount: '', payment_mode: 'cash', payment_reference: '',
  }
}

export default function InvoiceFormModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setForm(emptyForm())
    setError('')
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function setItem(idx, field, value) {
    setForm((f) => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...f, items }
    })
  }

  function addItem(description = '') {
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem(), description }] }))
  }

  function removeItem(idx) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
    const discount = Number(form.discount) || 0
    const tax = Number(form.tax) || 0
    const total = Math.max(0, subtotal - discount + tax)
    return { subtotal, total }
  }, [form.items, form.discount, form.tax])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.patient) { setError('Please select the patient being billed.'); return }
    const items = form.items.filter((it) => it.description.trim() && Number(it.unit_price) >= 0)
    if (!items.length) { setError('Add at least one billable item with a description and amount.'); return }
    setSaving(true)
    setError('')
    try {
      const saved = await api.billing.create({
        patient_id: form.patient.id,
        invoice_date: form.invoice_date,
        discount: form.discount,
        tax: form.tax,
        notes: form.notes.trim(),
        items: items.map((it) => ({ description: it.description.trim(), quantity: Number(it.quantity) || 1, unit_price: Number(it.unit_price) || 0 })),
        paid_amount: form.collectNow ? Number(form.paid_amount) || 0 : 0,
        payment_mode: form.payment_mode,
        payment_reference: form.payment_reference.trim(),
      })
      onSaved?.(saved)
      reset()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not create this invoice.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="Create New Invoice"
      subtitle="Naya Bill — add billable items, then optionally record the payment collected"
      size="xl"
      footer={
        <>
          <div className="mr-auto text-sm text-black/55">
            Total: <span className="font-bold text-[var(--color-text)] text-base">{formatMoney(totals.total)}</span>
          </div>
          <Button variant="ghost" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Create Invoice'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <PatientPicker patient={form.patient} onChange={(p) => set('patient', p)} />
          <TextField label="Invoice Date" type="date" value={form.invoice_date} onChange={(e) => set('invoice_date', e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-sm font-semibold text-[var(--color-text)]">
              Billable Items <span className="text-[var(--color-warning-error)]">*</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ITEMS.map((label) => (
                <button key={label} type="button" onClick={() => addItem(label)}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary-dark)] hover:bg-[#d8ecef] transition-colors">
                  + {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_72px_110px_auto] gap-2.5 items-start">
                <TextField placeholder="Description — e.g. Consultation Fee" value={item.description} onChange={(e) => setItem(idx, 'description', e.target.value)} />
                <TextField type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => setItem(idx, 'quantity', e.target.value)} />
                <TextField type="number" min="0" placeholder="Unit price" value={item.unit_price} onChange={(e) => setItem(idx, 'unit_price', e.target.value)} />
                <button type="button" onClick={() => removeItem(idx)} disabled={form.items.length === 1}
                  className="h-[46px] w-[46px] flex items-center justify-center rounded-[var(--radius-control)] text-black/35 hover:text-[var(--color-warning-error)] hover:bg-[#fbe7e7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addItem()} className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline">
            <Plus size={15} /> Add another item
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <TextField label="Discount (Rs.)" type="number" min="0" value={form.discount} onChange={(e) => set('discount', e.target.value)} placeholder="0" />
          <TextField label="Tax (Rs.)" type="number" min="0" value={form.tax} onChange={(e) => set('tax', e.target.value)} placeholder="0" />
          <div className="rounded-xl bg-[var(--color-secondary)]/50 p-3.5 flex flex-col justify-center">
            <p className="text-xs text-black/40">Subtotal {formatMoney(totals.subtotal)}</p>
            <p className="font-bold text-lg text-[var(--color-text)] font-[family-name:var(--font-heading)]">{formatMoney(totals.total)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-black/5 p-4">
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none mb-3">
            <input type="checkbox" className="w-5 h-5 rounded border-black/25 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
              checked={form.collectNow} onChange={(e) => set('collectNow', e.target.checked)} />
            <span className="text-[15px] font-medium">Collect payment now</span>
          </label>
          {form.collectNow ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <TextField label="Amount Received (Rs.)" type="number" min="0" value={form.paid_amount} onChange={(e) => set('paid_amount', e.target.value)} placeholder={String(totals.total || 0)} />
              <SelectField label="Payment Mode" options={PAYMENT_MODES} value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)} />
              <TextField label="Reference (optional)" value={form.payment_reference} onChange={(e) => set('payment_reference', e.target.value)} placeholder="Transaction / receipt no." />
            </div>
          ) : (
            <p className="text-sm text-black/40">The invoice will be created as <strong>unpaid</strong> — record a payment later from the invoice details.</p>
          )}
        </div>

        <TextArea label="Notes (optional)" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />

        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
