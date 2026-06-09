import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea, SelectField } from '../../components/Field'
import { api } from '../../lib/api'
import { todayISO } from '../../lib/format'

export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
]

function emptyForm() {
  return { category: 'rent', description: '', amount: '', expense_date: todayISO() }
}

export default function ExpenseFormModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setForm(emptyForm()); setError('') }
  }, [open])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) { setError('Please enter a valid amount.'); return }
    setSaving(true)
    setError('')
    try {
      const saved = await api.reports.addExpense({
        category: form.category,
        description: form.description.trim(),
        amount: form.amount,
        expense_date: form.expense_date,
      })
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not record this expense.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record an Expense"
      subtitle="Naya Kharcha — track clinic running costs to see your true profit"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save Expense'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField label="Category" options={EXPENSE_CATEGORIES} value={form.category} onChange={(e) => set('category', e.target.value)} />
          <TextField label="Amount (Rs.)" required type="number" min="0" step="any" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" />
        </div>
        <TextField label="Date" type="date" value={form.expense_date} onChange={(e) => set('expense_date', e.target.value)} />
        <TextArea label="Description (optional)" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. June clinic rent, Dr. Asad's salary…" />
        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
