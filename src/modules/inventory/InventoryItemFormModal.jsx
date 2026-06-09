import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea, SelectField } from '../../components/Field'
import SupplierFormModal from './SupplierFormModal'
import { api } from '../../lib/api'

const CATEGORIES = [
  { value: 'medicine', label: 'Medicine' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'equipment', label: 'Equipment' },
]

const UNITS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'box', label: 'Box' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'strip', label: 'Strip' },
  { value: 'vial', label: 'Vial' },
]

function emptyForm() {
  return {
    name: '', category: 'medicine', unit: 'pcs', quantity: '0', reorder_level: '10',
    unit_price: '', supplier_id: '', expiry_date: '', notes: '',
  }
}

export default function InventoryItemFormModal({ open, onClose, item, suppliers, onSaved, onSuppliersChanged }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    if (item) {
      setForm({
        name: item.name,
        category: item.category || 'medicine',
        unit: item.unit || 'pcs',
        quantity: String(item.quantity ?? '0'),
        reorder_level: String(item.reorder_level ?? '10'),
        unit_price: String(item.unit_price ?? ''),
        supplier_id: item.supplier_id ? String(item.supplier_id) : '',
        expiry_date: item.expiry_date || '',
        notes: item.notes || '',
      })
    } else {
      setForm(emptyForm())
    }
    setError('')
  }, [item, open])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  function handleSupplierSaved(supplier) {
    onSuppliersChanged?.()
    set('supplier_id', String(supplier.id))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Please enter the item name.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        id: item?.id,
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        quantity: form.quantity,
        reorder_level: form.reorder_level,
        unit_price: form.unit_price,
        supplier_id: form.supplier_id || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes.trim(),
      }
      const saved = item ? await api.inventory.update(payload) : await api.inventory.create(payload)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={item ? 'Edit Inventory Item' : 'Add Inventory Item'}
        subtitle="Naya Item — medicines, consumables and equipment in your stock"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="Item Name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Panadol 500mg Tablet" />

          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Category" options={CATEGORIES} value={form.category} onChange={(e) => set('category', e.target.value)} />
            <SelectField label="Unit" options={UNITS} value={form.unit} onChange={(e) => set('unit', e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <TextField label={item ? 'Current Quantity' : 'Opening Quantity'} type="number" min="0" step="any" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} disabled={!!item} hint={item ? 'Use “Adjust Stock” to change quantity' : undefined} />
            <TextField label="Reorder Level" type="number" min="0" step="any" value={form.reorder_level} onChange={(e) => set('reorder_level', e.target.value)} hint="Alert when stock falls to/below this" />
            <TextField label="Unit Price (Rs.)" type="number" min="0" step="any" value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <SelectField
              label="Supplier (optional)"
              placeholder="No supplier selected"
              options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
              value={form.supplier_id}
              onChange={(e) => set('supplier_id', e.target.value)}
            />
            <Button type="button" variant="outline" size="md" icon={Plus} onClick={() => setSupplierModalOpen(true)}>
              Add New Supplier
            </Button>
          </div>

          <TextField label="Expiry Date (optional)" type="date" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} hint="For medicines and perishable consumables" />
          <TextArea label="Notes (optional)" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />

          {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
        </form>
      </Modal>

      <SupplierFormModal open={supplierModalOpen} onClose={() => setSupplierModalOpen(false)} onSaved={handleSupplierSaved} />
    </>
  )
}
