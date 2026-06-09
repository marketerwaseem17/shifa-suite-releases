import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Phone, IdCard } from 'lucide-react'
import { PageHeader, Badge } from '../../components/Misc'
import { Card } from '../../components/Card'
import Button from '../../components/Button'
import Table, { Pagination } from '../../components/Table'
import { TextField } from '../../components/Field'
import PatientFormModal from './PatientFormModal'
import { api } from '../../lib/api'
import { formatDate, initialsOf } from '../../lib/format'

export default function Patients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ rows: [], total: 0, page: 1, pageSize: 25 })
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.patients.list({ search, page, pageSize: 25 }).then((res) => {
      setResult(res)
      setLoading(false)
    })
  }, [search, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(t)
  }, [search])

  const columns = [
    {
      key: 'full_name',
      label: 'Patient',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center text-sm font-semibold shrink-0">
            {initialsOf(row.full_name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{row.full_name}</p>
            <p className="text-xs text-black/40">{row.patient_code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row) => (
        <div className="text-sm text-black/60">
          {row.phone ? <p className="flex items-center gap-1.5"><Phone size={13} /> {row.phone}</p> : null}
          {row.cnic ? <p className="flex items-center gap-1.5 text-xs text-black/40 mt-0.5"><IdCard size={12} /> {row.cnic}</p> : null}
        </div>
      ),
    },
    {
      key: 'gender',
      label: 'Gender / Age',
      render: (row) => (
        <span className="text-sm text-black/55 capitalize">
          {row.gender || '—'}{row.dob ? ` · ${new Date().getFullYear() - new Date(row.dob).getFullYear()} yrs` : ''}
        </span>
      ),
    },
    {
      key: 'blood_group',
      label: 'Blood Group',
      render: (row) => row.blood_group ? <Badge tone="danger">{row.blood_group}</Badge> : <span className="text-black/30">—</span>,
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (row) => <span className="text-sm text-black/45">{formatDate(row.created_at)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Patient Management"
        titleUrdu="Mareez ka Record"
        subtitle="Search, register and manage every patient's full medical history in one place."
        actions={<Button icon={Plus} onClick={() => setModalOpen(true)}>Add New Patient</Button>}
      />

      <Card>
        <div className="mb-4">
          <TextField
            placeholder="Search by name, phone, CNIC or patient ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Table
          columns={columns}
          rows={result.rows}
          onRowClick={(row) => navigate(`/patients/${row.id}`)}
          emptyLabel={loading ? 'Loading patients…' : search ? 'No patients match your search' : 'No patients registered yet'}
          emptyHint={loading ? '' : search ? 'Try a different name, phone number or CNIC.' : 'Click "Add New Patient" to register your first patient — Naya Mareez darj karein.'}
        />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onChange={setPage} />
      </Card>

      <PatientFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        patient={null}
        onSaved={(p) => { load(); navigate(`/patients/${p.id}`) }}
      />
    </div>
  )
}
