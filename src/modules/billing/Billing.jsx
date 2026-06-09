import { useEffect, useState, useCallback } from 'react'
import { Plus, Receipt, Wallet, AlertCircle, TrendingUp } from 'lucide-react'
import { PageHeader, Badge } from '../../components/Misc'
import { Card, StatCard } from '../../components/Card'
import Button from '../../components/Button'
import Table, { Pagination } from '../../components/Table'
import { TextField, SelectField } from '../../components/Field'
import InvoiceFormModal from './InvoiceFormModal'
import InvoiceDetailModal from './InvoiceDetailModal'
import { api } from '../../lib/api'
import { formatMoney, formatDate, todayISO } from '../../lib/format'

const STATUS_TONES = { unpaid: 'danger', partial: 'warning', paid: 'success', void: 'neutral' }
const STATUSES = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
]

export default function Billing() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ rows: [], total: 0, page: 1, pageSize: 25 })
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [activeInvoiceId, setActiveInvoiceId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.billing.list({ search, status, page, pageSize: 25 }).then((res) => {
      setResult(res)
      setLoading(false)
    })
  }, [search, status, page])

  const loadSummary = useCallback(() => {
    api.billing.dailySummary(todayISO()).then(setSummary)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadSummary() }, [loadSummary])

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(t)
  }, [search, status])

  function refreshAll() {
    load()
    loadSummary()
  }

  const columns = [
    {
      key: 'invoice_no',
      label: 'Invoice',
      render: (row) => (
        <div>
          <p className="font-semibold">{row.invoice_no}</p>
          <p className="text-xs text-black/40">{formatDate(row.invoice_date)}</p>
        </div>
      ),
    },
    {
      key: 'patient_name',
      label: 'Patient',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium truncate">{row.patient_name}</p>
          <p className="text-xs text-black/40">{row.patient_code}{row.patient_phone ? ` · ${row.patient_phone}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      render: (row) => <span className="tabular-nums font-medium">{formatMoney(row.total)}</span>,
    },
    {
      key: 'due_amount',
      label: 'Due',
      render: (row) => (
        <span className={`tabular-nums font-medium ${row.due_amount > 0 ? 'text-[var(--color-warning-error)]' : 'text-[var(--color-success)]'}`}>
          {formatMoney(row.due_amount)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge tone={STATUS_TONES[row.status] || 'neutral'}>{row.status}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Billing & Invoicing"
        titleUrdu="Bill aur Receipt"
        subtitle="Generate branded invoices, collect payments and track what's still outstanding."
        actions={<Button icon={Plus} onClick={() => setFormOpen(true)}>Create Invoice</Button>}
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Today's Collection" value={formatMoney(summary?.collected)} hint={`${summary?.invoice_count || 0} invoice${summary?.invoice_count === 1 ? '' : 's'} today`} icon={Wallet} accent="success" />
        <StatCard label="Today's Billed" value={formatMoney(summary?.billed)} hint="Gross amount invoiced" icon={Receipt} accent="primary" />
        <StatCard label="Outstanding Today" value={formatMoney(summary?.outstanding)} hint="Yet to be collected" icon={AlertCircle} accent="danger" />
        <StatCard label="Net Cash After Expenses" value={formatMoney(summary?.netCash)} hint={`Expenses: ${formatMoney(summary?.expenses)}`} icon={TrendingUp} accent="accent" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[220px]">
            <TextField placeholder="Search by invoice no, patient name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-48">
            <SelectField placeholder="All statuses" options={STATUSES} value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
        </div>

        <Table
          columns={columns}
          rows={result.rows}
          onRowClick={(row) => setActiveInvoiceId(row.id)}
          emptyLabel={loading ? 'Loading invoices…' : search || status ? 'No invoices match your filters' : 'No invoices created yet'}
          emptyHint={loading ? '' : search || status ? 'Try a different search term or status.' : 'Click "Create Invoice" to bill your first patient — Pehla bill banayein.'}
        />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onChange={setPage} />
      </Card>

      <InvoiceFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refreshAll} />
      <InvoiceDetailModal
        open={Boolean(activeInvoiceId)}
        invoiceId={activeInvoiceId}
        onClose={() => setActiveInvoiceId(null)}
        onChanged={refreshAll}
      />
    </div>
  )
}
