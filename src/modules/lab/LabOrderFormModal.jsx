import { useEffect, useState } from 'react'
import { Paperclip } from 'lucide-react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea, SelectField } from '../../components/Field'
import PatientPicker from '../../components/PatientPicker'
import { api } from '../../lib/api'
import { todayISO } from '../../lib/format'

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'sample-collected', label: 'Sample Collected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const COMMON_TESTS = ['Complete Blood Count (CBC)', 'Blood Sugar (Random)', 'Lipid Profile', 'Liver Function Test (LFT)', 'Urine R/E', 'X-Ray Chest']

function emptyForm() {
  return { patient: null, doctor_id: '', test_name: '', lab_name: '', order_date: todayISO(), status: 'pending', result_summary: '' }
}

export default function LabOrderFormModal({ open, onClose, order, doctors, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [attaching, setAttaching] = useState(false)
  const [attachedName, setAttachedName] = useState('')

  useEffect(() => {
    if (!open) return
    if (order) {
      setForm({
        patient: { id: order.patient_id, full_name: order.patient_name, patient_code: order.patient_code },
        doctor_id: order.doctor_id || '',
        test_name: order.test_name,
        lab_name: order.lab_name || '',
        order_date: order.order_date,
        status: order.status,
        result_summary: order.result_summary || '',
      })
      setAttachedName(order.result_file_path ? order.result_file_path.split(/[\\/]/).pop().replace(/^\d+_/, '') : '')
    } else {
      setForm(emptyForm())
      setAttachedName('')
    }
    setError('')
  }, [order, open])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleAttach() {
    setAttaching(true)
    try {
      const picked = await api.lab.pickResultFile()
      if (picked && order) {
        await api.lab.attachResult({ id: order.id, file_path: picked.file_path })
        setAttachedName(picked.file_name)
        set('status', 'completed')
      } else if (picked) {
        setAttachedName(picked.file_name)
        setError('Save this order first, then attach the result file.')
      }
    } finally {
      setAttaching(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.patient) { setError('Please select the patient this test is for.'); return }
    if (!form.test_name.trim()) { setError('Please enter the test or scan name.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        id: order?.id,
        patient_id: form.patient.id,
        doctor_id: form.doctor_id || null,
        test_name: form.test_name.trim(),
        lab_name: form.lab_name.trim(),
        order_date: form.order_date,
        status: form.status,
        result_summary: form.result_summary.trim(),
      }
      const saved = order ? await api.lab.update(payload) : await api.lab.create(payload)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this lab order.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={order ? `Edit Lab Order — ${order.order_no}` : 'Order New Test / Scan'}
      subtitle="Naya Test — record the test ordered, lab and update results as they come in"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : order ? 'Save Changes' : 'Create Order'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PatientPicker patient={form.patient} onChange={(p) => set('patient', p)} />

        <div>
          <span className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
            Test / Scan Name <span className="text-[var(--color-warning-error)]">*</span>
          </span>
          <TextField required value={form.test_name} onChange={(e) => set('test_name', e.target.value)} placeholder="e.g. Complete Blood Count (CBC)" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {COMMON_TESTS.map((t) => (
              <button key={t} type="button" onClick={() => set('test_name', t)}
                className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary-dark)] hover:bg-[#d8ecef] transition-colors">
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField label="Ordering Doctor" placeholder="Select doctor (optional)" options={doctors.map((d) => ({ value: d.id, label: d.full_name }))} value={form.doctor_id} onChange={(e) => set('doctor_id', e.target.value)} />
          <TextField label="Lab / Diagnostic Center" value={form.lab_name} onChange={(e) => set('lab_name', e.target.value)} placeholder="e.g. Shifa Diagnostic Lab" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Order Date" type="date" value={form.order_date} onChange={(e) => set('order_date', e.target.value)} />
          <SelectField label="Status" options={STATUSES} value={form.status} onChange={(e) => set('status', e.target.value)} />
        </div>

        <TextArea label="Result Summary (optional)" rows={3} value={form.result_summary} onChange={(e) => set('result_summary', e.target.value)} placeholder="Key findings once the result is in…" />

        <div>
          <span className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Result File (optional)</span>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" icon={Paperclip} onClick={handleAttach} disabled={attaching}>
              {attaching ? 'Opening…' : attachedName ? 'Replace File' : 'Attach Result File'}
            </Button>
            {attachedName ? <span className="text-sm text-black/55 truncate">{attachedName}</span> : <span className="text-sm text-black/35">PDF, PNG or JPG — copied into Shifa Suite's secure storage.</span>}
          </div>
          {!order ? <p className="text-xs text-black/35 mt-1.5">Create the order first, then reopen it to attach the result file.</p> : null}
        </div>

        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
