import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Pencil, Phone, Stethoscope, UserCog, Headset, ShieldCheck } from 'lucide-react'
import { PageHeader, Badge, EmptyState, LoadingScreen } from '../../components/Misc'
import { Card } from '../../components/Card'
import Button from '../../components/Button'
import { SelectField } from '../../components/Field'
import StaffFormModal from './StaffFormModal'
import { api } from '../../lib/api'
import { initialsOf } from '../../lib/format'

const ROLE_META = {
  doctor:        { label: 'Doctor', tone: 'primary', icon: Stethoscope },
  receptionist:  { label: 'Receptionist', tone: 'accent', icon: Headset },
  admin:         { label: 'Admin', tone: 'success', icon: ShieldCheck },
}

const ROLE_FILTERS = [
  { value: 'doctor', label: 'Doctors' },
  { value: 'receptionist', label: 'Receptionists' },
  { value: 'admin', label: 'Admins' },
]

export default function Staff() {
  const [rows, setRows] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => { api.staff.list().then(setRows) }, [])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((r) => !roleFilter || r.role === roleFilter)
  }, [rows, roleFilter])

  return (
    <div>
      <PageHeader
        title="Doctor & Staff Management"
        titleUrdu="Staff Intezam"
        subtitle="Manage who works at your clinic — doctors, receptionists and admins, with login access."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>Add Staff Member</Button>}
      />

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="w-52">
            <SelectField placeholder="All roles" options={ROLE_FILTERS} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} />
          </div>
          {rows ? <p className="text-sm text-black/40">{filtered.length} member{filtered.length === 1 ? '' : 's'}</p> : null}
        </div>

        {!rows ? (
          <LoadingScreen label="Loading staff directory…" />
        ) : filtered.length ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filtered.map((m) => {
              const meta = ROLE_META[m.role] || { label: m.role, tone: 'neutral', icon: UserCog }
              const Icon = meta.icon
              return (
                <div key={m.id} className={`p-4 rounded-xl border ${m.active ? 'border-black/5' : 'border-black/5 opacity-55'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center font-bold shrink-0">
                      {initialsOf(m.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{m.full_name}</p>
                      <p className="text-xs text-black/40 truncate">@{m.username}</p>
                      {m.specialization || m.qualification ? (
                        <p className="text-xs text-black/45 mt-0.5 truncate">{[m.specialization, m.qualification].filter(Boolean).join(' · ')}</p>
                      ) : null}
                    </div>
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => { setEditing(m); setFormOpen(true) }} aria-label="Edit staff member" />
                  </div>
                  <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-black/5">
                    <Badge tone={meta.tone}><span className="inline-flex items-center gap-1"><Icon size={12} /> {meta.label}</span></Badge>
                    {!m.active ? <Badge tone="danger">Inactive</Badge> : null}
                    {m.phone ? <span className="text-xs text-black/45 inline-flex items-center gap-1"><Phone size={12} /> {m.phone}</span> : null}
                  </div>
                  {m.shift_notes ? <p className="text-xs text-black/40 mt-2.5 line-clamp-2">{m.shift_notes}</p> : null}
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={UserCog}
            title={roleFilter ? 'No staff members in this role' : 'No staff members added yet'}
            message={roleFilter ? 'Try a different role filter, or add a new staff member.' : 'Add your doctors, receptionists and admin staff so they can be assigned to appointments and visits.'}
            action={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>Add Staff Member</Button>}
          />
        )}
      </Card>

      <StaffFormModal open={formOpen} onClose={() => setFormOpen(false)} member={editing} onSaved={load} />
    </div>
  )
}
