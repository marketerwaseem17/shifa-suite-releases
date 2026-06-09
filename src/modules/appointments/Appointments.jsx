import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, Clock3, UserRound, Footprints,
  CheckCircle2, XCircle, PlayCircle, LogIn, Pencil, Trash2, CalendarX,
} from 'lucide-react'
import { PageHeader, Badge, EmptyState, LoadingScreen } from '../../components/Misc'
import { Card, StatCard } from '../../components/Card'
import Button from '../../components/Button'
import ConfirmDialog from '../../components/ConfirmDialog'
import { SelectField } from '../../components/Field'
import AppointmentFormModal from './AppointmentFormModal'
import { api } from '../../lib/api'
import { formatTime12, formatDate, initialsOf, todayISO } from '../../lib/format'

const STATUS_META = {
  scheduled:    { tone: 'primary', label: 'Scheduled' },
  'checked-in': { tone: 'warning', label: 'Checked-in' },
  'in-progress':{ tone: 'warning', label: 'In Progress' },
  completed:    { tone: 'success', label: 'Completed' },
  cancelled:    { tone: 'danger',  label: 'Cancelled' },
  'no-show':    { tone: 'danger',  label: 'No-show' },
}

const NEXT_STATUS = {
  scheduled: { next: 'checked-in', label: 'Check In', icon: LogIn },
  'checked-in': { next: 'in-progress', label: 'Start Visit', icon: PlayCircle },
  'in-progress': { next: 'completed', label: 'Mark Completed', icon: CheckCircle2 },
}

function shiftDate(iso, days) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function dayLabel(iso) {
  const today = todayISO()
  if (iso === today) return 'Today'
  if (iso === shiftDate(today, 1)) return 'Tomorrow'
  if (iso === shiftDate(today, -1)) return 'Yesterday'
  return formatDate(iso, { weekday: 'long', month: 'short', day: 'numeric', year: undefined })
}

export default function Appointments() {
  const navigate = useNavigate()
  const [date, setDate] = useState(todayISO())
  const [rows, setRows] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [doctorFilter, setDoctorFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.appointments.list({ date }).then(setRows)
  }, [date])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.staff.list().then((list) => setDoctors(list.filter((u) => u.role === 'doctor' && u.active))) }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((r) =>
      (!doctorFilter || String(r.doctor_id) === String(doctorFilter)) &&
      (!statusFilter || r.status === statusFilter)
    )
  }, [rows, doctorFilter, statusFilter])

  const stats = useMemo(() => {
    if (!rows) return { total: 0, waiting: 0, completed: 0, cancelled: 0 }
    return {
      total: rows.length,
      waiting: rows.filter((r) => ['scheduled', 'checked-in', 'in-progress'].includes(r.status)).length,
      completed: rows.filter((r) => r.status === 'completed').length,
      cancelled: rows.filter((r) => ['cancelled', 'no-show'].includes(r.status)).length,
    }
  }, [rows])

  async function setStatus(appt, status) {
    setBusy(true)
    try {
      await api.appointments.update({ ...appt, status })
      load()
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel(status) {
    if (!cancelTarget) return
    setBusy(true)
    try {
      await api.appointments.update({ ...cancelTarget.appt, status })
      setCancelTarget(null)
      load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Appointment & Scheduling"
        titleUrdu="Waqt ka Tayyun"
        subtitle="Plan your day, manage walk-ins and keep the waiting room moving smoothly."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true) }}>Book Appointment</Button>}
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Appointments Today" value={stats.total} icon={CalendarDays} accent="primary" />
        <StatCard label="Waiting / In Progress" value={stats.waiting} icon={Clock3} accent="accent" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="success" />
        <StatCard label="Cancelled / No-show" value={stats.cancelled} icon={CalendarX} accent="danger" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDate((d) => shiftDate(d, -1))}><ChevronLeft size={18} /></Button>
            <div className="text-center min-w-[180px]">
              <p className="font-semibold font-[family-name:var(--font-heading)]">{dayLabel(date)}</p>
              <p className="text-xs text-black/40">{formatDate(date)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDate((d) => shiftDate(d, 1))}><ChevronRight size={18} /></Button>
            {date !== todayISO() ? <Button variant="outline" size="sm" onClick={() => setDate(todayISO())}>Jump to Today</Button> : null}
          </div>
          <div className="flex items-center gap-2.5">
            <SelectField
              className="!py-2 text-sm min-w-[170px]"
              placeholder="All doctors"
              options={doctors.map((d) => ({ value: d.id, label: d.full_name }))}
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            />
            <SelectField
              className="!py-2 text-sm min-w-[150px]"
              placeholder="All statuses"
              options={Object.entries(STATUS_META).map(([value, { label }]) => ({ value, label }))}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        {!rows ? (
          <LoadingScreen label="Loading the schedule…" />
        ) : filtered.length ? (
          <div className="space-y-2.5">
            {filtered.map((appt) => {
              const meta = STATUS_META[appt.status] || { tone: 'neutral', label: appt.status }
              const advance = NEXT_STATUS[appt.status]
              return (
                <div key={appt.id} className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-black/5 hover:border-[var(--color-primary)]/25 transition-colors">
                  <div className="text-center w-20 shrink-0">
                    <p className="font-semibold text-sm tabular-nums">{formatTime12(appt.start_time)}</p>
                    <p className="text-xs text-black/35 tabular-nums">– {formatTime12(appt.end_time)}</p>
                  </div>

                  <button onClick={() => navigate(`/patients/${appt.patient_id}`)} className="flex items-center gap-3 min-w-0 flex-1 text-left group">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center font-semibold shrink-0">
                      {initialsOf(appt.patient_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-[var(--color-primary)] transition-colors">{appt.patient_name}</p>
                      <p className="text-xs text-black/40 truncate">{appt.patient_code} · {appt.reason || 'No reason specified'}</p>
                    </div>
                  </button>

                  <div className="hidden md:flex items-center gap-1.5 text-sm text-black/45 shrink-0">
                    <UserRound size={15} /> {appt.doctor_name || 'Any doctor'}
                  </div>

                  {appt.source === 'walk-in' ? (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--color-accent-dark)] bg-[#fdf1e2] px-2.5 py-1 rounded-full shrink-0">
                      <Footprints size={13} /> Walk-in {appt.queue_no ? `#${appt.queue_no}` : ''}
                    </span>
                  ) : null}

                  <Badge tone={meta.tone}>{meta.label}</Badge>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {advance ? (
                      <Button size="sm" variant="outline" icon={advance.icon} onClick={() => setStatus(appt, advance.next)} disabled={busy}>
                        {advance.label}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => { setEditing(appt); setModalOpen(true) }} aria-label="Edit appointment" />
                    {!['completed', 'cancelled', 'no-show'].includes(appt.status) ? (
                      <Button size="sm" variant="ghost" icon={XCircle} className="text-[var(--color-warning-error)] hover:bg-[#fbe7e7]" onClick={() => setCancelTarget({ appt })} aria-label="Cancel appointment" />
                    ) : (
                      <Button size="sm" variant="ghost" icon={Trash2} className="text-black/35 hover:text-[var(--color-warning-error)] hover:bg-[#fbe7e7]" onClick={() => setCancelTarget({ appt, remove: true })} aria-label="Remove appointment" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title={rows.length ? 'No appointments match these filters' : 'No appointments scheduled for this day'}
            message={rows.length ? 'Try clearing the doctor or status filter.' : 'Click "Book Appointment" to schedule a visit, or register a walk-in patient as they arrive.'}
            action={!rows.length ? <Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true) }}>Book Appointment</Button> : null}
          />
        )}
      </Card>

      <AppointmentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        appointment={editing}
        defaultDate={date}
        doctors={doctors}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (cancelTarget?.remove) {
            setBusy(true)
            try { await api.appointments.remove(cancelTarget.appt.id); setCancelTarget(null); load() } finally { setBusy(false) }
          } else {
            handleCancel('cancelled')
          }
        }}
        title={cancelTarget?.remove ? 'Permanently delete this appointment?' : 'Cancel this appointment?'}
        message={
          cancelTarget?.remove
            ? `This will permanently remove the appointment record for ${cancelTarget?.appt?.patient_name}. This cannot be undone.`
            : `${cancelTarget?.appt?.patient_name}'s appointment at ${cancelTarget ? formatTime12(cancelTarget.appt.start_time) : ''} will be marked as cancelled. Yeh appointment cancel kar di jayegi.`
        }
        confirmLabel={cancelTarget?.remove ? 'Yes, delete permanently' : 'Yes, cancel appointment'}
        loading={busy}
      />
    </div>
  )
}
