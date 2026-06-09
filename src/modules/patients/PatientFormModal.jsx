import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea, SelectField } from '../../components/Field'
import { api } from '../../lib/api'

const GENDERS = [
  { value: 'male', label: 'Male / Mard' },
  { value: 'female', label: 'Female / Aurat' },
  { value: 'other', label: 'Other' },
]
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const empty = {
  full_name: '', phone: '', cnic: '', gender: '', dob: '', blood_group: '',
  address: '', guardian_name: '', allergies: '', chronic_conditions: '', medical_history: '', notes: '',
}

export default function PatientFormModal({ open, onClose, patient, onSaved }) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(patient ? { ...empty, ...patient } : empty)
    setError('')
  }, [patient, open])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      setError('Patient name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = patient
        ? await api.patients.update({ ...form, id: patient.id })
        : await api.patients.create(form)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save patient record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={patient ? `Edit Patient — ${patient.full_name}` : 'Add New Patient'}
      subtitle={patient ? `Patient ID: ${patient.patient_code}` : 'Naya Mareez — fill in as much as you can; you can always edit later'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : patient ? 'Save Changes' : 'Add Patient'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <TextField label="Full Name" labelUrdu="Poora Naam" required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
        <TextField label="Phone Number" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" />
        <TextField label="CNIC" value={form.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder="xxxxx-xxxxxxx-x" />
        <SelectField label="Gender" placeholder="Select gender" options={GENDERS} value={form.gender} onChange={(e) => set('gender', e.target.value)} />
        <TextField label="Date of Birth" type="date" value={form.dob || ''} onChange={(e) => set('dob', e.target.value)} />
        <SelectField label="Blood Group" placeholder="Select blood group" options={BLOOD_GROUPS} value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)} />
        <div className="sm:col-span-2">
          <TextArea label="Address" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <TextField label="Guardian / Attendant Name (optional)" value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} />
        <TextField label="Known Allergies" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="e.g. Penicillin" />
        <div className="sm:col-span-2">
          <TextArea label="Chronic Conditions" rows={2} value={form.chronic_conditions} onChange={(e) => set('chronic_conditions', e.target.value)} placeholder="e.g. Diabetes, Hypertension" />
        </div>
        <div className="sm:col-span-2">
          <TextArea label="Medical History / Notes" rows={3} value={form.medical_history} onChange={(e) => set('medical_history', e.target.value)} />
        </div>
        {error ? <p className="sm:col-span-2 text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
