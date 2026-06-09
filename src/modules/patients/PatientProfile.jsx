import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Phone, IdCard, MapPin, Droplets, AlertTriangle, Pencil, Trash2, Plus,
  Stethoscope, CalendarClock, Receipt, FileText, FlaskConical, Paperclip, Activity,
} from 'lucide-react'
import { PageHeader, Badge, EmptyState, LoadingScreen } from '../../components/Misc'
import { Card } from '../../components/Card'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { TextField, TextArea, SelectField } from '../../components/Field'
import PatientFormModal from './PatientFormModal'
import { api } from '../../lib/api'
import { formatDate, formatDateTime, formatTime12, formatMoney, initialsOf } from '../../lib/format'

const TABS = [
  { key: 'visits', label: 'Visit History', labelUrdu: 'Visits', icon: Stethoscope },
  { key: 'appointments', label: 'Appointments', icon: CalendarClock },
  { key: 'invoices', label: 'Billing', icon: Receipt },
  { key: 'prescriptions', label: 'Prescriptions', icon: FileText },
  { key: 'lab', label: 'Lab Orders', icon: FlaskConical },
  { key: 'attachments', label: 'Attachments', icon: Paperclip },
]

const STATUS_TONES = {
  scheduled: 'primary', 'checked-in': 'warning', 'in-progress': 'warning', completed: 'success',
  cancelled: 'danger', 'no-show': 'danger', unpaid: 'danger', partial: 'warning', paid: 'success',
  void: 'neutral', pending: 'warning', 'sample-collected': 'primary',
}

function ageOf(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)))
}

function InfoRow({ icon: Icon, label, value, tone }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon size={16} className="text-black/35 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-black/40">{label}</p>
        <p className={`font-medium truncate ${tone === 'danger' ? 'text-[var(--color-warning-error)]' : 'text-[var(--color-text)]'}`}>{value}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, count, action, children }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold font-[family-name:var(--font-heading)]">
          {title}{typeof count === 'number' ? <span className="text-black/35 font-normal text-sm"> · {count}</span> : null}
        </h3>
        {action}
      </div>
      {children}
    </Card>
  )
}

const VISIT_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'emergency', label: 'Emergency' },
]

const emptyVisit = {
  doctor_id: '', visit_type: 'consultation', complaint: '', diagnosis: '', treatment_plan: '',
  follow_up_date: '', bp: '', temp: '', weight: '', height: '', pulse: '', spo2: '',
}

function AddVisitModal({ open, onClose, patientId, doctors, onSaved }) {
  const [form, setForm] = useState(emptyVisit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setForm(emptyVisit); setError('') }
  }, [open])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { bp, temp, weight, height, pulse, spo2, ...rest } = form
      const vitals = { bp, temp, weight, height, pulse, spo2 }
      const hasVitals = Object.values(vitals).some((v) => String(v).trim())
      const saved = await api.patients.addVisit({
        ...rest,
        patient_id: patientId,
        doctor_id: form.doctor_id || null,
        follow_up_date: form.follow_up_date || null,
        vitals: hasVitals ? vitals : null,
      })
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this visit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record New Visit"
      subtitle="Naya Visit — capture vitals, complaint, diagnosis and treatment plan"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save Visit'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField
            label="Attending Doctor"
            placeholder="Select doctor (optional)"
            options={doctors.map((d) => ({ value: d.id, label: d.full_name }))}
            value={form.doctor_id}
            onChange={(e) => set('doctor_id', e.target.value)}
          />
          <SelectField label="Visit Type" options={VISIT_TYPES} value={form.visit_type} onChange={(e) => set('visit_type', e.target.value)} />
        </div>

        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Activity size={15} className="text-[var(--color-primary)]" /> Vitals</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <TextField label="Blood Pressure" placeholder="120/80" value={form.bp} onChange={(e) => set('bp', e.target.value)} />
            <TextField label="Temperature (°F)" value={form.temp} onChange={(e) => set('temp', e.target.value)} />
            <TextField label="Pulse (bpm)" value={form.pulse} onChange={(e) => set('pulse', e.target.value)} />
            <TextField label="Weight (kg)" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
            <TextField label="Height (cm)" value={form.height} onChange={(e) => set('height', e.target.value)} />
            <TextField label="SpO₂ (%)" value={form.spo2} onChange={(e) => set('spo2', e.target.value)} />
          </div>
        </div>

        <TextArea label="Chief Complaint" rows={2} value={form.complaint} onChange={(e) => set('complaint', e.target.value)} placeholder="What is the patient experiencing?" />
        <TextArea label="Diagnosis" rows={2} value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} />
        <TextArea label="Treatment Plan" rows={2} value={form.treatment_plan} onChange={(e) => set('treatment_plan', e.target.value)} />
        <TextField label="Follow-up Date (optional)" type="date" value={form.follow_up_date} onChange={(e) => set('follow_up_date', e.target.value)} />

        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}

function VitalsPills({ vitals }) {
  if (!vitals) return null
  let parsed
  try { parsed = JSON.parse(vitals) } catch { return null }
  const entries = [
    ['bp', 'BP'], ['temp', 'Temp'], ['pulse', 'Pulse'], ['weight', 'Wt'], ['height', 'Ht'], ['spo2', 'SpO₂'],
  ].filter(([k]) => parsed[k] && String(parsed[k]).trim())
  if (!entries.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {entries.map(([k, label]) => (
        <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-black/[0.04] text-black/55">{label}: {parsed[k]}</span>
      ))}
    </div>
  )
}

export default function PatientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [tab, setTab] = useState('visits')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [visitOpen, setVisitOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    api.patients.get(Number(id)).then(setData)
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.staff.list().then((rows) => setDoctors(rows.filter((r) => r.role === 'doctor' && r.active))) }, [])

  const doctorByID = useMemo(() => {
    const map = new Map()
    doctors.forEach((d) => map.set(d.id, d))
    return map
  }, [doctors])

  if (!data) return <LoadingScreen label="Loading patient record…" />
  if (!data.patient) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="Patient not found"
        message="This patient record may have been removed."
        action={<Button variant="primary" onClick={() => navigate('/patients')}>Back to Patient List</Button>}
      />
    )
  }

  const { patient, visits, attachments, appointments, invoices, prescriptions, labOrders } = data
  const age = ageOf(patient.dob)

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.patients.remove(patient.id)
      navigate('/patients')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate('/patients')}
        className="inline-flex items-center gap-1.5 text-sm text-black/45 hover:text-[var(--color-primary)] transition-colors mb-4"
      >
        <ArrowLeft size={16} /> Back to Patients
      </button>

      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-5 mb-5">
        <Card>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center text-xl font-bold shrink-0">
              {initialsOf(patient.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold font-[family-name:var(--font-heading)] truncate">{patient.full_name}</h1>
              <p className="text-sm text-black/40">{patient.patient_code} · Registered {formatDate(patient.created_at)}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {patient.gender ? <Badge tone="primary">{patient.gender} {age != null ? `· ${age} yrs` : ''}</Badge> : null}
                {patient.blood_group ? <Badge tone="danger">{patient.blood_group}</Badge> : null}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5 mt-5 pt-5 border-t border-black/5">
            <InfoRow icon={Phone} label="Phone" value={patient.phone} />
            <InfoRow icon={IdCard} label="CNIC" value={patient.cnic} />
            <InfoRow icon={MapPin} label="Address" value={patient.address} />
            <InfoRow icon={Droplets} label="Guardian / Attendant" value={patient.guardian_name} />
          </div>

          {(patient.allergies || patient.chronic_conditions) ? (
            <div className="mt-4 pt-4 border-t border-black/5 space-y-2">
              {patient.allergies ? (
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle size={16} className="text-[var(--color-warning-error)] mt-0.5 shrink-0" />
                  <p><span className="font-semibold">Allergies:</span> <span className="text-black/60">{patient.allergies}</span></p>
                </div>
              ) : null}
              {patient.chronic_conditions ? (
                <div className="flex items-start gap-2 text-sm">
                  <Activity size={16} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
                  <p><span className="font-semibold">Chronic Conditions:</span> <span className="text-black/60">{patient.chronic_conditions}</span></p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-2 mt-5 pt-5 border-t border-black/5">
            <Button variant="outline" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>Edit Details</Button>
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteOpen(true)} className="text-[var(--color-warning-error)] hover:bg-[#fbe7e7]">Remove Patient</Button>
            <div className="ml-auto">
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setVisitOpen(true)}>Record Visit</Button>
            </div>
          </div>
        </Card>

        {(patient.medical_history || patient.notes) ? (
          <Card>
            <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-3">Medical History & Notes</h3>
            <p className="text-sm text-black/60 whitespace-pre-wrap leading-relaxed">{patient.medical_history || '—'}</p>
            {patient.notes ? <p className="text-sm text-black/45 mt-3 pt-3 border-t border-black/5 whitespace-pre-wrap">{patient.notes}</p> : null}
          </Card>
        ) : (
          <Card className="flex items-center">
            <EmptyState
              icon={FileText}
              title="No medical history recorded"
              message="Add medical history and notes from the Edit Details form so every visit has full context."
            />
          </Card>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors
              ${tab === key ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'bg-white text-black/55 border border-black/5 hover:bg-[var(--color-secondary)]/60'}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'visits' ? (
        <SectionCard title="Visit History" count={visits.length} action={<Button size="sm" icon={Plus} onClick={() => setVisitOpen(true)}>Record Visit</Button>}>
          {visits.length ? (
            <div className="space-y-3">
              {visits.map((v) => (
                <div key={v.id} className="p-4 rounded-xl border border-black/5 bg-[var(--color-secondary)]/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{formatDateTime(v.visit_date)}</p>
                      {v.visit_type ? <Badge tone="primary">{v.visit_type}</Badge> : null}
                    </div>
                    {v.doctor_id && doctorByID.get(v.doctor_id) ? (
                      <p className="text-xs text-black/40">Seen by {doctorByID.get(v.doctor_id).full_name}</p>
                    ) : null}
                  </div>
                  <VitalsPills vitals={v.vitals} />
                  <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
                    {v.complaint ? <p><span className="text-black/40 text-xs block">Complaint</span>{v.complaint}</p> : null}
                    {v.diagnosis ? <p><span className="text-black/40 text-xs block">Diagnosis</span>{v.diagnosis}</p> : null}
                    {v.treatment_plan ? <p><span className="text-black/40 text-xs block">Treatment Plan</span>{v.treatment_plan}</p> : null}
                  </div>
                  {v.follow_up_date ? <p className="text-xs text-[var(--color-accent-dark)] mt-2">Follow-up suggested on {formatDate(v.follow_up_date)}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Stethoscope} title="No visits recorded yet" message="Click 'Record Visit' to log this patient's first consultation, vitals and diagnosis." />
          )}
        </SectionCard>
      ) : null}

      {tab === 'appointments' ? (
        <SectionCard title="Appointments" count={appointments.length} action={<Button size="sm" variant="outline" onClick={() => navigate('/appointments')}>Open Scheduler</Button>}>
          {appointments.length ? (
            <div className="space-y-2.5">
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3.5 rounded-xl border border-black/5">
                  <div>
                    <p className="font-medium text-sm">{formatDate(a.appt_date)} · {formatTime12(a.start_time)}–{formatTime12(a.end_time)}</p>
                    <p className="text-xs text-black/40 mt-0.5">{a.reason || 'No reason specified'} {a.source === 'walk-in' ? '· Walk-in' : ''}</p>
                  </div>
                  <Badge tone={STATUS_TONES[a.status] || 'neutral'}>{a.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarClock} title="No appointments yet" message="Appointments booked for this patient will appear here." />
          )}
        </SectionCard>
      ) : null}

      {tab === 'invoices' ? (
        <SectionCard title="Billing & Invoices" count={invoices.length} action={<Button size="sm" variant="outline" onClick={() => navigate('/billing')}>Open Billing</Button>}>
          {invoices.length ? (
            <div className="space-y-2.5">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3.5 rounded-xl border border-black/5">
                  <div>
                    <p className="font-medium text-sm">{inv.invoice_no} · {formatDate(inv.invoice_date)}</p>
                    <p className="text-xs text-black/40 mt-0.5">Total {formatMoney(inv.total)} · Paid {formatMoney(inv.paid_amount)} · Due {formatMoney(inv.due_amount)}</p>
                  </div>
                  <Badge tone={STATUS_TONES[inv.status] || 'neutral'}>{inv.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Receipt} title="No invoices yet" message="Invoices generated for this patient's visits and procedures will appear here." />
          )}
        </SectionCard>
      ) : null}

      {tab === 'prescriptions' ? (
        <SectionCard title="Prescriptions" count={prescriptions.length} action={<Button size="sm" variant="outline" onClick={() => navigate('/prescriptions')}>Open Prescriptions</Button>}>
          {prescriptions.length ? (
            <div className="space-y-2.5">
              {prescriptions.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3.5 rounded-xl border border-black/5">
                  <div>
                    <p className="font-medium text-sm">{p.prescription_no} · {formatDate(p.presc_date)}</p>
                    <p className="text-xs text-black/40 mt-0.5">{p.diagnosis || 'No diagnosis recorded'}</p>
                  </div>
                  {p.follow_up_date ? <Badge tone="warning">Follow-up {formatDate(p.follow_up_date)}</Badge> : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={FileText} title="No prescriptions yet" message="E-prescriptions written for this patient will be listed here." />
          )}
        </SectionCard>
      ) : null}

      {tab === 'lab' ? (
        <SectionCard title="Lab Orders" count={labOrders.length} action={<Button size="sm" variant="outline" onClick={() => navigate('/lab')}>Open Lab & Diagnostics</Button>}>
          {labOrders.length ? (
            <div className="space-y-2.5">
              {labOrders.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3.5 rounded-xl border border-black/5">
                  <div>
                    <p className="font-medium text-sm">{l.test_name} · {l.order_no}</p>
                    <p className="text-xs text-black/40 mt-0.5">Ordered {formatDate(l.order_date)} {l.lab_name ? `· ${l.lab_name}` : ''}</p>
                  </div>
                  <Badge tone={STATUS_TONES[l.status] || 'neutral'}>{l.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={FlaskConical} title="No lab orders yet" message="Tests ordered for this patient and their results will be tracked here." />
          )}
        </SectionCard>
      ) : null}

      {tab === 'attachments' ? (
        <SectionCard title="Attachments" count={attachments.length}>
          {attachments.length ? (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {attachments.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-black/5">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                    <Paperclip size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.file_name}</p>
                    <p className="text-xs text-black/40">{f.category || 'other'} · {formatDate(f.uploaded_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Paperclip} title="No attachments yet" message="Lab reports, X-rays and scans uploaded for this patient will appear here." />
          )}
        </SectionCard>
      ) : null}

      <PatientFormModal open={editOpen} onClose={() => setEditOpen(false)} patient={patient} onSaved={load} />
      <AddVisitModal open={visitOpen} onClose={() => setVisitOpen(false)} patientId={patient.id} doctors={doctors} onSaved={load} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Remove this patient record?"
        message={`${patient.full_name} (${patient.patient_code}) will be archived and hidden from lists. Their visit, billing and prescription history will be preserved. Yeh patient record hata diya jayega.`}
        confirmLabel="Yes, remove patient"
        loading={deleting}
      />
    </div>
  )
}
