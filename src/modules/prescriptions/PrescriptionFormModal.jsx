import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Pill } from 'lucide-react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea, SelectField } from '../../components/Field'
import PatientPicker from '../../components/PatientPicker'
import { api } from '../../lib/api'
import { todayISO } from '../../lib/format'

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every morning', 'Every night', 'As needed (SOS)']
const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '2 weeks', '1 month', 'Ongoing']

const emptyItem = () => ({ drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' })

function DrugNameField({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const boxRef = useRef(null)

  useEffect(() => {
    if (!value.trim()) { setResults([]); return }
    const t = setTimeout(() => api.prescriptions.drugs(value).then(setResults), 200)
    return () => clearTimeout(t)
  }, [value])

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="w-full rounded-[var(--radius-control)] border border-black/15 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        placeholder="Drug name — e.g. Panadol 500mg"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length ? (
        <div className="absolute z-10 mt-1.5 w-full bg-white rounded-xl border border-black/10 shadow-lg max-h-56 overflow-y-auto">
          {results.map((d) => (
            <button
              type="button"
              key={d.id}
              onClick={() => { onChange(d.name); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--color-secondary)]/50 text-left transition-colors"
            >
              <Pill size={14} className="text-[var(--color-primary)] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs text-black/40 truncate">{[d.generic_name, d.common_dosage, d.common_form].filter(Boolean).join(' · ')}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function emptyForm() {
  return { patient: null, doctor_id: '', presc_date: todayISO(), diagnosis: '', advice: '', follow_up_date: '', items: [emptyItem()] }
}

export default function PrescriptionFormModal({ open, onClose, prescription, doctors, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (prescription) {
      setForm({
        patient: { id: prescription.prescription.patient_id, full_name: prescription.prescription.patient_name, patient_code: prescription.prescription.patient_code },
        doctor_id: prescription.prescription.doctor_id || '',
        presc_date: prescription.prescription.presc_date,
        diagnosis: prescription.prescription.diagnosis || '',
        advice: prescription.prescription.advice || '',
        follow_up_date: prescription.prescription.follow_up_date || '',
        items: prescription.items.length ? prescription.items.map((it) => ({ ...it })) : [emptyItem()],
      })
    } else {
      setForm(emptyForm())
    }
    setError('')
  }, [prescription, open])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }
  function setItem(idx, field, value) {
    setForm((f) => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...f, items }
    })
  }
  function addItem() { setForm((f) => ({ ...f, items: [...f.items, emptyItem()] })) }
  function removeItem(idx) { setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.patient) { setError('Please select the patient this prescription is for.'); return }
    const items = form.items.filter((it) => it.drug_name.trim())
    if (!items.length) { setError('Add at least one medicine to the prescription.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        id: prescription?.prescription?.id,
        patient_id: form.patient.id,
        doctor_id: form.doctor_id || null,
        presc_date: form.presc_date,
        diagnosis: form.diagnosis.trim(),
        advice: form.advice.trim(),
        follow_up_date: form.follow_up_date || null,
        items: items.map((it) => ({
          drug_name: it.drug_name.trim(), dosage: it.dosage.trim?.() ?? it.dosage,
          frequency: it.frequency, duration: it.duration, instructions: it.instructions?.trim?.() ?? it.instructions,
        })),
      }
      const saved = prescription ? await api.prescriptions.update(payload) : await api.prescriptions.create(payload)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this prescription.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={prescription ? `Edit Prescription — ${prescription.prescription.prescription_no}` : 'Write New Prescription'}
      subtitle="Naya Nuskha — search the patient, write the diagnosis and add medicines"
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : prescription ? 'Save Changes' : 'Save Prescription'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-[1.4fr_1fr] gap-4">
          <PatientPicker patient={form.patient} onChange={(p) => set('patient', p)} />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Prescribing Doctor" placeholder="Select doctor" options={doctors.map((d) => ({ value: d.id, label: d.full_name }))} value={form.doctor_id} onChange={(e) => set('doctor_id', e.target.value)} />
            <TextField label="Date" type="date" value={form.presc_date} onChange={(e) => set('presc_date', e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <TextArea label="Diagnosis" rows={2} value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="e.g. Acute pharyngitis" />
          <TextArea label="Advice / Instructions to Patient" rows={2} value={form.advice} onChange={(e) => set('advice', e.target.value)} placeholder="e.g. Plenty of fluids, avoid cold drinks" />
        </div>

        <div>
          <span className="block text-sm font-semibold text-[var(--color-text)] mb-2">
            Medicines <span className="text-[var(--color-warning-error)]">*</span>
          </span>
          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-black/5 bg-[var(--color-secondary)]/25 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-[var(--color-primary)] w-5 text-center shrink-0">{idx + 1}.</span>
                  <div className="flex-1"><DrugNameField value={item.drug_name} onChange={(v) => setItem(idx, 'drug_name', v)} /></div>
                  <button type="button" onClick={() => removeItem(idx)} disabled={form.items.length === 1}
                    className="h-[46px] w-[46px] flex items-center justify-center rounded-[var(--radius-control)] text-black/35 hover:text-[var(--color-warning-error)] hover:bg-[#fbe7e7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0">
                    <Trash2 size={17} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pl-7">
                  <TextField placeholder="Dosage e.g. 1 tablet" value={item.dosage} onChange={(e) => setItem(idx, 'dosage', e.target.value)} />
                  <SelectField placeholder="Frequency" options={FREQUENCIES} value={item.frequency || ''} onChange={(e) => setItem(idx, 'frequency', e.target.value)} />
                  <SelectField placeholder="Duration" options={DURATIONS} value={item.duration || ''} onChange={(e) => setItem(idx, 'duration', e.target.value)} />
                  <TextField placeholder="Instructions e.g. After meals" value={item.instructions || ''} onChange={(e) => setItem(idx, 'instructions', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline">
            <Plus size={15} /> Add another medicine
          </button>
        </div>

        <TextField label="Follow-up Date (optional)" type="date" value={form.follow_up_date || ''} onChange={(e) => set('follow_up_date', e.target.value)} />

        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
