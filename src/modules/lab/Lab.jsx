import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FlaskConical, Pencil, Paperclip, Clock3 } from 'lucide-react'
import { PageHeader, Badge, EmptyState, LoadingScreen } from '../../components/Misc'
import { Card, StatCard } from '../../components/Card'
import Button from '../../components/Button'
import { TextField, SelectField } from '../../components/Field'
import LabOrderFormModal from './LabOrderFormModal'
import { api } from '../../lib/api'
import { formatDate, initialsOf } from '../../lib/format'

const STATUS_META = {
  pending:           { tone: 'warning', label: 'Pending' },
  'sample-collected':{ tone: 'primary', label: 'Sample Collected' },
  completed:         { tone: 'success', label: 'Completed' },
  cancelled:         { tone: 'danger',  label: 'Cancelled' },
}

const STATUS_FILTERS = Object.entries(STATUS_META).map(([value, { label }]) => ({ value, label }))

export default function Lab() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => {
    api.lab.list({ search, status }).then(setRows)
  }, [search, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.staff.list().then((list) => setDoctors(list.filter((u) => u.role === 'doctor' && u.active))) }, [])
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const pendingCount = rows ? rows.filter((r) => r.status === 'pending').length : 0
  const collectedCount = rows ? rows.filter((r) => r.status === 'sample-collected').length : 0
  const completedCount = rows ? rows.filter((r) => r.status === 'completed').length : 0

  return (
    <div>
      <PageHeader
        title="Lab & Diagnostics"
        titleUrdu="Lab Test"
        subtitle="Order tests and scans, track results from the lab, and keep every report on file."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>Order Test</Button>}
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Pending" value={pendingCount} hint="Awaiting sample collection" icon={Clock3} accent="accent" />
        <StatCard label="Sample Collected" value={collectedCount} hint="At the lab, awaiting results" icon={FlaskConical} accent="primary" />
        <StatCard label="Completed" value={completedCount} hint="Results received" icon={Paperclip} accent="success" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[220px]">
            <TextField placeholder="Search by order no., test name or patient…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-52">
            <SelectField placeholder="All statuses" options={STATUS_FILTERS} value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
        </div>

        {!rows ? (
          <LoadingScreen label="Loading lab orders…" />
        ) : rows.length ? (
          <div className="space-y-2.5">
            {rows.map((order) => {
              const meta = STATUS_META[order.status] || { tone: 'neutral', label: order.status }
              return (
                <div key={order.id} className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-black/5 hover:border-[var(--color-primary)]/25 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                    <FlaskConical size={18} />
                  </div>
                  <button onClick={() => navigate(`/patients/${order.patient_id}`)} className="flex items-center gap-3 min-w-0 flex-1 text-left group">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center text-sm font-semibold shrink-0">
                      {initialsOf(order.patient_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-[var(--color-primary)] transition-colors">{order.test_name}</p>
                      <p className="text-xs text-black/40 truncate">{order.patient_name} · {order.order_no} · Ordered {formatDate(order.order_date)} {order.lab_name ? `· ${order.lab_name}` : ''}</p>
                    </div>
                  </button>
                  {order.result_file_path ? (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--color-success)] bg-[#e3f6ea] px-2.5 py-1 rounded-full shrink-0">
                      <Paperclip size={12} /> Result attached
                    </span>
                  ) : null}
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => { setEditing(order); setFormOpen(true) }} aria-label="Update lab order" />
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={FlaskConical}
            title={search || status ? 'No lab orders match your filters' : 'No lab orders yet'}
            message={search || status ? 'Try a different search term or status.' : 'Click "Order Test" to send a patient for a lab test, X-ray or scan.'}
            action={!search && !status ? <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>Order Test</Button> : null}
          />
        )}
      </Card>

      <LabOrderFormModal open={formOpen} onClose={() => setFormOpen(false)} order={editing} doctors={doctors} onSaved={load} />
    </div>
  )
}
