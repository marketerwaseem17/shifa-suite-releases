import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, TrendingUp, TrendingDown, Wallet, Banknote, FileSpreadsheet, FileDown, Receipt } from 'lucide-react'
import { PageHeader, Badge, EmptyState, LoadingScreen } from '../../components/Misc'
import { Card, StatCard } from '../../components/Card'
import Button from '../../components/Button'
import { TextField } from '../../components/Field'
import ExpenseFormModal, { EXPENSE_CATEGORIES } from './ExpenseFormModal'
import { api } from '../../lib/api'
import { formatMoney, formatDate, todayISO } from '../../lib/format'

function firstOfMonthISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const CATEGORY_LABELS = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]))

function MiniBarChart({ data }) {
  if (!data?.length) return <EmptyState title="Not enough data yet" message="Your daily revenue trend for this period will appear here." />
  const max = Math.max(...data.map((d) => d.billed), 1)
  return (
    <div className="flex items-end gap-1.5 h-44 pt-4 overflow-x-auto">
      {data.map((d) => (
        <div key={d.date} className="flex-1 min-w-[10px] flex flex-col items-center gap-1.5 group">
          <span className="text-[10px] text-black/40 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums whitespace-nowrap">{formatMoney(d.collected)}</span>
          <div className="w-full rounded-t-md bg-[var(--color-secondary)] relative" style={{ height: '100%' }}>
            <div
              className="absolute bottom-0 inset-x-0 rounded-t-md bg-[var(--color-primary)] transition-all"
              style={{ height: `${Math.max(4, (d.billed / max) * 100)}%` }}
            />
            <div
              className="absolute bottom-0 inset-x-0 rounded-t-md bg-[var(--color-success)] transition-all"
              style={{ height: `${Math.max(0, (d.collected / max) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-black/35 whitespace-nowrap">{formatDate(d.date, { month: 'short', day: 'numeric', year: undefined })}</span>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const [from, setFrom] = useState(firstOfMonthISO)
  const [to, setTo] = useState(todayISO)
  const [revenue, setRevenue] = useState(null)
  const [expenses, setExpenses] = useState(null)
  const [profit, setProfit] = useState(null)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [exporting, setExporting] = useState('')

  const load = useCallback(() => {
    const params = { from, to }
    api.reports.revenue(params).then(setRevenue)
    api.reports.expenses(params).then(setExpenses)
    api.reports.profitSummary(params).then(setProfit)
  }, [from, to])

  useEffect(() => { load() }, [load])

  const ready = revenue && expenses && profit

  const netProfit = ready ? profit.profit : 0
  const isProfit = netProfit >= 0

  async function handleExport(kind) {
    setExporting(kind)
    try {
      if (kind === 'excel') await api.reports.exportExcel({ from, to })
      else await api.reports.exportPdf({ from, to })
    } finally {
      setExporting('')
    }
  }

  const quickRanges = useMemo(() => ([
    { label: 'This Month', from: firstOfMonthISO(), to: todayISO() },
    {
      label: 'Last 30 Days',
      from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
      to: todayISO(),
    },
    {
      label: 'This Year',
      from: `${new Date().getFullYear()}-01-01`,
      to: todayISO(),
    },
  ]), [])

  return (
    <div>
      <PageHeader
        title="Financial & Reports"
        titleUrdu="Hisaab Kitaab"
        subtitle="See revenue, expenses and profit at a glance — export clean reports for your accountant anytime."
        actions={
          <>
            <Button variant="outline" icon={Receipt} onClick={() => setExpenseModalOpen(true)}>Record Expense</Button>
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => handleExport('excel')} disabled={!!exporting}>
              {exporting === 'excel' ? 'Exporting…' : 'Export Excel'}
            </Button>
            <Button icon={FileDown} onClick={() => handleExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? 'Exporting…' : 'Export PDF Summary'}
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-44">
            <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            {quickRanges.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => { setFrom(r.from); setTo(r.to) }}
                className="text-xs font-semibold px-3 py-2 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary-dark)] hover:bg-[#d8ecef] transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {!ready ? (
        <LoadingScreen label="Crunching the numbers…" />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <StatCard label="Total Billed" value={formatMoney(revenue.totals.billed)} hint={`${revenue.totals.invoice_count} invoice${revenue.totals.invoice_count === 1 ? '' : 's'}`} icon={Wallet} accent="primary" />
            <StatCard label="Collected" value={formatMoney(revenue.totals.collected)} hint="Cash actually received" icon={Banknote} accent="success" />
            <StatCard label="Outstanding Dues" value={formatMoney(revenue.totals.outstanding)} hint="Yet to be collected" icon={TrendingDown} accent="accent" />
            <StatCard
              label="Net Profit"
              value={formatMoney(netProfit)}
              hint={`Collected (${formatMoney(profit.revenue)}) − Expenses (${formatMoney(profit.expenses)})`}
              icon={isProfit ? TrendingUp : TrendingDown}
              accent={isProfit ? 'success' : 'danger'}
            />
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 mb-5">
            <Card>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold font-[family-name:var(--font-heading)]">Revenue Trend</h3>
                <div className="flex items-center gap-3 text-xs text-black/40">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" /> Billed</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]" /> Collected</span>
                </div>
              </div>
              <MiniBarChart data={revenue.daily} />
            </Card>

            <Card>
              <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-3">Expenses by Category</h3>
              {expenses.byCategory.length ? (
                <div className="space-y-3">
                  {expenses.byCategory.map((c) => {
                    const pct = expenses.total ? Math.round((c.amount / expenses.total) * 100) : 0
                    return (
                      <div key={c.category}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-black/65">{CATEGORY_LABELS[c.category] || c.category}</span>
                          <span className="font-semibold tabular-nums">{formatMoney(c.amount)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon={Receipt} title="No expenses recorded" message="Record rent, salaries and other running costs to track your true profit." action={<Button size="sm" icon={Plus} onClick={() => setExpenseModalOpen(true)}>Record Expense</Button>} />
              )}
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold font-[family-name:var(--font-heading)]">Expense Log</h3>
              <p className="text-sm text-black/40">{expenses.rows.length} entr{expenses.rows.length === 1 ? 'y' : 'ies'} · Total {formatMoney(expenses.total)}</p>
            </div>
            {expenses.rows.length ? (
              <div className="space-y-2">
                {expenses.rows.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-4 p-3.5 rounded-xl border border-black/5">
                    <div className="w-9 h-9 rounded-lg bg-[#fdecdd] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                      <Receipt size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{r.description || CATEGORY_LABELS[r.category] || r.category}</p>
                      <p className="text-xs text-black/40">{formatDate(r.expense_date)}</p>
                    </div>
                    <Badge tone="neutral">{CATEGORY_LABELS[r.category] || r.category}</Badge>
                    <p className="font-semibold tabular-nums text-[var(--color-warning-error)]">- {formatMoney(r.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Receipt} title="No expenses in this period" message="Try a different date range, or record your first expense." />
            )}
          </Card>
        </>
      )}

      <ExpenseFormModal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} onSaved={load} />
    </div>
  )
}
