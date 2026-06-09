import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, SelectField, TextArea } from '../../components/Field'
import PatientPicker from '../../components/PatientPicker'
import { api } from '../../lib/api'

const SOURCES = [
  { value: 'booked', label: 'Booked Appointment' },
  { value: 'walk-in', label: 'Walk-in' },
]

const STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'checked-in', label: 'Checked-in' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No-show' },
]

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60)
  const mm = ((total % 60) + 60) % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function emptyForm(date) {
  return {
    patient: null, doctor_id: '', appt_date: date, start_time: '10:00', end_time: '10:20',
    source: 'booked', status: 'scheduled', reason: '', notes: '',
  }
}

export default function AppointmentFormModal({ open, onClose, appointment, defaultDate, doctors, onSaved }) {
  const [form, setForm] = useState(() => emptyForm(defaultDate))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)

  useEffect(() => {
    if (!open) return
    if (appointment) {
      setForm({
        patient: { id: appointment.patient_id, full_name: appointment.patient_name, patient_code: appointment.patient_code, phone: appointment.patient_phone },
        doctor_id: appointment.doctor_id || '',
        appt_date: appointment.appt_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        source: appointment.source,
        status: appointment.status,
        reason: appointment.reason || '',
        notes: appointment.notes || '',
      })
    } else {
      setForm(emptyForm(defaultDate))
    }
    setError('')
    setConflict(false)
  }, [appointment, open, defaultDate])

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'start_time') next.end_time = addMinutes(value, 20)
      return next
    })
    setConflict(false)
  }

  useEffect(() => {
    if (!form.doctor_id || !form.appt_date || !form.start_time || !form.end_time) { setConflict(false); return }
    const t = setTimeout(() => {
      api.appointments.checkConflict({
        id: appointment?.id, doctor_id: form.doctor_id, appt_date: form.appt_date,
        start_time: form.start_time, end_time: form.end_time,
      }).then((res) => setConflict(res.conflict))
    }, 300)
    return () => clearTimeout(t)
  }, [form.doctor_id, form.appt_date, form.start_time, form.end_time, appointment?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.patient) { setError('Please select a patient for this appointment.'); return }
    if (form.end_time <= form.start_time) { setError('End time must be after the start time.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        id: appointment?.id,
        patient_id: form.patient.id,
        doctor_id: form.doctor_id || null,
        appt_date: form.appt_date,
        start_time: form.start_time,
        end_time: form.end_time,
        source: form.source,
        status: form.status,
        reason: form.reason.trim(),
        notes: form.notes.trim(),
      }
      const saved = appointment ? await api.appointments.update(payload) : await api.appointments.create(payload)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this appointment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={appointment ? 'Edit Appointment' : 'Book New Appointment'}
      subtitle={appointment ? `${appointment.patient_name} · ${appointment.appt_date}` : 'Naya Appointment — search the patient, pick a doctor, date and time slot'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : appointment ? 'Save Changes' : 'Book Appointment'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PatientPicker patient={form.patient} onChange={(p) => set('patient', p)} />

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField
            label="Doctor"
            placeholder="Any available doctor"
            options={doctors.map((d) => ({ value: d.id, label: d.full_name }))}
            value={form.doctor_id}
            onChange={(e) => set('doctor_id', e.target.value)}
          />
          <SelectField label="Type" options={SOURCES} value={form.source} onChange={(e) => set('source', e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <TextField label="Date" type="date" required value={form.appt_date} onChange={(e) => set('appt_date', e.target.value)} />
          <TextField label="Start Time" type="time" required value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
          <TextField label="End Time" type="time" required value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
        </div>

        {conflict ? (
          <p className="text-sm text-[var(--color-accent-dark)] bg-[#fdf1e2] rounded-lg px-3 py-2 font-medium">
            ⚠ This doctor already has an appointment that overlaps this time slot. You can still book it, but please double-check the schedule.
          </p>
        ) : null}

        {appointment ? (
          <SelectField label="Status" options={STATUSES} value={form.status} onChange={(e) => set('status', e.target.value)} />
        ) : null}

        <TextField label="Reason for Visit" value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="e.g. Follow-up checkup, Fever & cough" />
        <TextArea label="Notes (optional)" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />

        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
