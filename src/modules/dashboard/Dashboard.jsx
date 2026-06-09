import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Users2, Wallet, TrendingUp, FlaskConical, PackageX, ArrowUpRight } from 'lucide-react'
import { Card, StatCard } from '../../components/Card'
import { LoadingScreen, EmptyState } from '../../components/Misc'
import { Badge } from '../../components/Misc'
import { api } from '../../lib/api'
import { formatMoney, formatDate } from '../../lib/format'

function MiniBarChart({ data, valueKey, labelKey, color = 'var(--color-primary)' }) {
  if (!data?.length) return <EmptyState title="Not enough data yet" message="Revenue trend will appear here once you start billing patients." />
  const max = Math.max(...data.map((d) => d[valueKey]), 1)
  return (
    <div className="flex items-end gap-2 h-40 pt-4">
      {data.map((d) => (
        <div key={d[labelKey]} className="flex-1 flex flex-col items-center gap-1.5 group">
          <span className="text-[10px] text-black/40 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">{formatMoney(d[valueKey])}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{ height: `${Math.max(6, (d[valueKey] / max) * 100)}%`, background: color, minHeight: 4 }}
          />
          <span className="text-[10px] text-black/35">{formatDate(d[labelKey], { month: 'short', day: 'numeric', year: undefined })}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.dashboard.summary().then(setData)
  }, [])

  if (!data) return <LoadingScreen label="Loading today's snapshot…" />

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Today's Appointments" value={data.todaysAppointments} hint={`${data.todaysQueue} still in queue`} icon={CalendarDays} accent="primary" />
        <StatCard label="Today's Revenue" value={formatMoney(data.todaysRevenue)} hint="Cash collected today" icon={Wallet} accent="success" />
        <StatCard label="This Month's Revenue" value={formatMoney(data.monthRevenue)} hint="Month to date" icon={TrendingUp} accent="accent" />
        <StatCard label="New Patients" value={data.newPatientsThisMonth} hint="This month" icon={Users2} accent="primary" />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <Card>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold font-[family-name:var(--font-heading)]">Revenue Trend — Last 14 Days</h3>
            <button onClick={() => navigate('/reports')} className="text-sm text-[var(--color-primary)] font-medium inline-flex items-center gap-1 hover:underline">
              Full report <ArrowUpRight size={14} />
            </button>
          </div>
          <MiniBarChart data={data.revenueTrend} valueKey="amount" labelKey="date" />
        </Card>

        <Card>
          <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-3">Needs Your Attention</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/appointments')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--color-secondary)]/60 hover:bg-[var(--color-secondary)] transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-white text-[var(--color-primary)] flex items-center justify-center"><CalendarDays size={18} /></div>
              <div className="flex-1">
                <p className="font-medium text-sm">{data.todaysQueue} patient{data.todaysQueue === 1 ? '' : 's'} waiting today</p>
                <p className="text-xs text-black/40">Open the queue & scheduling board</p>
              </div>
            </button>
            <button onClick={() => navigate('/lab')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--color-secondary)]/60 hover:bg-[var(--color-secondary)] transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-white text-[var(--color-accent)] flex items-center justify-center"><FlaskConical size={18} /></div>
              <div className="flex-1">
                <p className="font-medium text-sm">{data.pendingLabOrders} lab result{data.pendingLabOrders === 1 ? '' : 's'} pending</p>
                <p className="text-xs text-black/40">Review and update lab order statuses</p>
              </div>
            </button>
            <button onClick={() => navigate('/inventory')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--color-secondary)]/60 hover:bg-[var(--color-secondary)] transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-white text-[var(--color-warning-error)] flex items-center justify-center"><PackageX size={18} /></div>
              <div className="flex-1">
                <p className="font-medium text-sm">{data.lowStockCount} item{data.lowStockCount === 1 ? '' : 's'} low on stock</p>
                <p className="text-xs text-black/40">Reorder before you run out</p>
              </div>
            </button>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-3">Top Diagnoses — Last 30 Days</h3>
          {data.topDiagnoses.length ? (
            <ul className="space-y-2">
              {data.topDiagnoses.map((d) => (
                <li key={d.diagnosis} className="flex items-center justify-between text-sm">
                  <span className="text-black/65 truncate pr-3">{d.diagnosis}</span>
                  <Badge tone="primary">{d.n} visit{d.n === 1 ? '' : 's'}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No diagnosis data yet" message="Diagnoses recorded during patient visits will be summarized here." />
          )}
        </Card>
        <Card>
          <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-3">Top Prescribed Medicines — Last 30 Days</h3>
          {data.topMedicines.length ? (
            <ul className="space-y-2">
              {data.topMedicines.map((m) => (
                <li key={m.drug_name} className="flex items-center justify-between text-sm">
                  <span className="text-black/65 truncate pr-3">{m.drug_name}</span>
                  <Badge tone="accent">{m.n}× prescribed</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No prescriptions yet" message="The medicines you prescribe most often will be ranked here." />
          )}
        </Card>
      </div>
    </div>
  )
}
