import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea } from '../../components/Field'
import { api } from '../../lib/api'

function emptyForm() {
  return { name: '', contact_person: '', phone: '', email: '', address: '', notes: '' }
}

export default function SupplierFormModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setForm(emptyForm()); setError('') }
  }, [open])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Please enter the supplier or vendor name.'); return }
    setSaving(true)
    setError('')
    try {
      const saved = await api.inventory.createSupplier({
        name: form.name.trim(),
        contact_person: form.contact_person.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      })
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this supplier.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Supplier / Vendor"
      subtitle="Naya Supplier — keep a record of who you order medicines and supplies from"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save Supplier'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField label="Supplier / Vendor Name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Al-Shifa Pharma Distributors" />
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Contact Person" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} />
          <TextField label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Email (optional)" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <TextField label="Address (optional)" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <TextArea label="Notes (optional)" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
