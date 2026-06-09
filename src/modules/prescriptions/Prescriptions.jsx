import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileDown, Pencil, FileText } from 'lucide-react'
import { PageHeader, Badge, EmptyState, LoadingScreen } from '../../components/Misc'
import { Card } from '../../components/Card'
import Button from '../../components/Button'
import { TextField } from '../../components/Field'
import PrescriptionFormModal from './PrescriptionFormModal'
import { api } from '../../lib/api'
import { formatDate, initialsOf } from '../../lib/format'

export default function Prescriptions() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    api.prescriptions.list({ search }).then(setRows)
  }, [search])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.staff.list().then((list) => setDoctors(list.filter((u) => u.role === 'doctor' && u.active))) }, [])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function openEdit(row) {
    setBusyId(row.id)
    try {
      const full = await api.prescriptions.get(row.id)
      setEditing(full)
      setFormOpen(true)
    } finally {
      setBusyId(null)
    }
  }

  async function downloadPdf(row) {
    setBusyId(row.id)
    try {
      await api.prescriptions.generatePdf(row.id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="E-Prescription"
        titleUrdu="Nuskha"
        subtitle="Write digital prescriptions with the clinic letterhead — printed or shared in seconds."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>Write Prescription</Button>}
      />

      <Card>
        <div className="mb-4 max-w-md">
          <TextField placeholder="Search by prescription no. or patient name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {!rows ? (
          <LoadingScreen label="Loading prescriptions…" />
        ) : rows.length ? (
          <div className="space-y-2.5">
            {rows.map((rx) => (
              <div key={rx.id} className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-black/5 hover:border-[var(--color-primary)]/25 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <button onClick={() => navigate(`/patients/${rx.patient_id}`)} className="flex items-center gap-3 min-w-0 flex-1 text-left group">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center text-sm font-semibold shrink-0">
                    {initialsOf(rx.patient_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate group-hover:text-[var(--color-primary)] transition-colors">{rx.patient_name}</p>
                    <p className="text-xs text-black/40 truncate">{rx.prescription_no} · {formatDate(rx.presc_date)} {rx.doctor_name ? `· ${rx.doctor_name}` : ''}</p>
                  </div>
                </button>
                {rx.diagnosis ? <Badge tone="primary">{rx.diagnosis}</Badge> : null}
                {rx.follow_up_date ? <Badge tone="warning">Follow-up {formatDate(rx.follow_up_date)}</Badge> : null}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" icon={FileDown} onClick={() => downloadPdf(rx)} disabled={busyId === rx.id}>PDF</Button>
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(rx)} disabled={busyId === rx.id} aria-label="Edit prescription" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title={search ? 'No prescriptions match your search' : 'No prescriptions written yet'}
            message={search ? 'Try a different prescription number or patient name.' : 'Click "Write Prescription" to create your first e-prescription — Pehla nuskha likhein.'}
            action={!search ? <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>Write Prescription</Button> : null}
          />
        )}
      </Card>

      <PrescriptionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        prescription={editing}
        doctors={doctors}
        onSaved={load}
      />
    </div>
  )
}
