import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileDown, Plus, Ban } from 'lucide-react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { Badge, EmptyState, Spinner } from '../../components/Misc'
import ConfirmDialog from '../../components/ConfirmDialog'
import { TextField, SelectField } from '../../components/Field'
import { api } from '../../lib/api'
import { formatMoney, formatDate, formatDateTime } from '../../lib/format'

const STATUS_TONES = { unpaid: 'danger', partial: 'warning', paid: 'success', void: 'neutral' }

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online / Bank Transfer' },
  { value: 'bank', label: 'Bank Deposit' },
]

export default function InvoiceDetailModal({ open, onClose, invoiceId, onChanged }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [payment, setPayment] = useState({ amount: '', mode: 'cash', reference: '' })
  const [voidOpen, setVoidOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = () => { if (invoiceId) api.billing.get(invoiceId).then(setData) }

  useEffect(() => {
    if (open && invoiceId) {
      setData(null)
      setShowPayment(false)
      setError('')
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceId])

  if (!open) return null
  if (!data) {
    return (
      <Modal open={open} onClose={onClose} title="Loading invoice…" size="lg">
        <div className="py-10 flex justify-center"><Spinner className="text-[var(--color-primary)] w-8 h-8" /></div>
      </Modal>
    )
  }

  const { invoice, items, payments } = data

  async function recordPayment(e) {
    e.preventDefault()
    const amount = Number(payment.amount)
    if (!amount || amount <= 0) { setError('Enter a valid amount received.'); return }
    setBusy(true)
    setError('')
    try {
      await api.billing.recordPayment({ invoice_id: invoice.id, amount, mode: payment.mode, reference: payment.reference.trim() })
      setShowPayment(false)
      load()
      onChanged?.()
    } catch (err) {
      setError(err.message || 'Could not record this payment.')
    } finally {
      setBusy(false)
    }
  }

  async function generatePdf() {
    setBusy(true)
    try {
      await api.billing.generatePdf(invoice.id)
    } finally {
      setBusy(false)
    }
  }

  async function voidInvoice() {
    setBusy(true)
    try {
      await api.billing.remove(invoice.id)
      setVoidOpen(false)
      load()
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice.invoice_no}
      subtitle={`${invoice.patient_name} · ${invoice.patient_code} · ${formatDate(invoice.invoice_date)}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => navigate(`/patients/${invoice.patient_id}`)}>View Patient</Button>
          {invoice.status !== 'void' ? (
            <Button variant="ghost" icon={Ban} onClick={() => setVoidOpen(true)} className="text-[var(--color-warning-error)] hover:bg-[#fbe7e7]">Void Invoice</Button>
          ) : null}
          <Button variant="outline" icon={FileDown} onClick={generatePdf} disabled={busy}>Download / Print PDF</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Badge tone={STATUS_TONES[invoice.status] || 'neutral'}>{invoice.status}</Badge>
          <div className="text-right">
            <p className="text-xs text-black/40">Total</p>
            <p className="text-xl font-bold font-[family-name:var(--font-heading)]">{formatMoney(invoice.total)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-black/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-secondary)]/50 text-black/50 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">Description</th>
                <th className="text-right font-semibold px-4 py-2.5">Qty</th>
                <th className="text-right font-semibold px-4 py-2.5">Unit Price</th>
                <th className="text-right font-semibold px-4 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-2.5">{it.description}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{it.quantity}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(it.unit_price)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-black/[0.02] grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <p className="text-black/45">Subtotal <span className="block font-semibold text-[var(--color-text)]">{formatMoney(invoice.subtotal)}</span></p>
            <p className="text-black/45">Discount <span className="block font-semibold text-[var(--color-text)]">− {formatMoney(invoice.discount)}</span></p>
            <p className="text-black/45">Tax <span className="block font-semibold text-[var(--color-text)]">+ {formatMoney(invoice.tax)}</span></p>
            <p className="text-black/45">Due <span className={`block font-semibold ${invoice.due_amount > 0 ? 'text-[var(--color-warning-error)]' : 'text-[var(--color-success)]'}`}>{formatMoney(invoice.due_amount)}</span></p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="font-semibold text-sm">Payments Received</h4>
            {invoice.due_amount > 0 && invoice.status !== 'void' ? (
              <Button size="sm" variant="outline" icon={Plus} onClick={() => { setShowPayment((s) => !s); setPayment({ amount: String(invoice.due_amount), mode: 'cash', reference: '' }); setError('') }}>
                Record Payment
              </Button>
            ) : null}
          </div>

          {showPayment ? (
            <form onSubmit={recordPayment} className="grid sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--color-secondary)]/40 mb-3">
              <TextField label="Amount Received" type="number" min="0" value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} />
              <SelectField label="Mode" options={PAYMENT_MODES} value={payment.mode} onChange={(e) => setPayment((p) => ({ ...p, mode: e.target.value }))} />
              <TextField label="Reference (optional)" value={payment.reference} onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))} />
              <div className="sm:col-span-3 flex items-center gap-2.5">
                <Button type="submit" size="sm" disabled={busy}>{busy ? 'Saving…' : 'Save Payment'}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowPayment(false)}>Cancel</Button>
                {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
              </div>
            </form>
          ) : null}

          {payments.length ? (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm px-3.5 py-2.5 rounded-xl border border-black/5">
                  <div>
                    <p className="font-medium">{formatMoney(p.amount)} <span className="text-black/40 font-normal">via {p.mode}</span></p>
                    <p className="text-xs text-black/40">{formatDateTime(p.paid_at)} {p.reference ? `· Ref: ${p.reference}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No payments recorded yet" message="Payments collected against this invoice will be listed here." />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        onConfirm={voidInvoice}
        title="Void this invoice?"
        message={`${invoice.invoice_no} will be marked as void and excluded from revenue reports. The record is kept for your audit trail. Yeh invoice void ho jayegi.`}
        confirmLabel="Yes, void invoice"
        loading={busy}
      />
    </Modal>
  )
}
