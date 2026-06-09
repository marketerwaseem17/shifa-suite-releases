import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Package, AlertTriangle, Boxes, Pencil, SlidersHorizontal, Trash2, Banknote } from 'lucide-react'
import { PageHeader, Badge, EmptyState, LoadingScreen } from '../../components/Misc'
import { Card, StatCard } from '../../components/Card'
import Button from '../../components/Button'
import { TextField, SelectField } from '../../components/Field'
import ConfirmDialog from '../../components/ConfirmDialog'
import InventoryItemFormModal from './InventoryItemFormModal'
import StockAdjustModal from './StockAdjustModal'
import { api } from '../../lib/api'
import { formatMoney, formatDate } from '../../lib/format'

const CATEGORY_FILTERS = [
  { value: 'medicine', label: 'Medicines' },
  { value: 'consumable', label: 'Consumables' },
  { value: 'equipment', label: 'Equipment' },
]

function isExpiringSoon(dateStr) {
  if (!dateStr) return false
  const days = (new Date(dateStr).getTime() - Date.now()) / 86400000
  return days >= 0 && days <= 60
}

function isExpired(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr).getTime() < Date.now()
}

export default function Inventory() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [rows, setRows] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [removeBusy, setRemoveBusy] = useState(false)

  const load = useCallback(() => {
    api.inventory.list({ search, lowStockOnly }).then(setRows)
  }, [search, lowStockOnly])

  const loadSuppliers = useCallback(() => { api.inventory.suppliers().then(setSuppliers) }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadSuppliers() }, [loadSuppliers])
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((r) => !category || r.category === category)
  }, [rows, category])

  const stats = useMemo(() => {
    if (!rows) return { total: 0, lowStock: 0, value: 0, expiring: 0 }
    return rows.reduce((acc, r) => {
      acc.total += 1
      if (r.quantity <= r.reorder_level) acc.lowStock += 1
      acc.value += Number(r.quantity) * Number(r.unit_price)
      if (isExpiringSoon(r.expiry_date) || isExpired(r.expiry_date)) acc.expiring += 1
      return acc
    }, { total: 0, lowStock: 0, value: 0, expiring: 0 })
  }, [rows])

  async function handleRemove() {
    if (!removing) return
    setRemoveBusy(true)
    try {
      await api.inventory.remove(removing.id)
      setRemoving(null)
      load()
    } finally {
      setRemoveBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory Management"
        titleUrdu="Stock Intezam"
        subtitle="Track medicines, consumables and equipment — get notified before anything runs out or expires."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>Add Item</Button>}
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Items in Stock" value={stats.total} hint="Across all categories" icon={Boxes} accent="primary" />
        <StatCard label="Low Stock Alerts" value={stats.lowStock} hint="At or below reorder level" icon={AlertTriangle} accent="danger" />
        <StatCard label="Expiring / Expired" value={stats.expiring} hint="Within the next 60 days" icon={AlertTriangle} accent="accent" />
        <StatCard label="Stock Value" value={formatMoney(stats.value)} hint="Quantity × unit price" icon={Banknote} accent="success" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[220px]">
            <TextField placeholder="Search by item name or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-48">
            <SelectField placeholder="All categories" options={CATEGORY_FILTERS} value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={() => setLowStockOnly((v) => !v)}
            className={`text-sm font-semibold px-3.5 py-2.5 rounded-[var(--radius-control)] border transition-colors inline-flex items-center gap-2
              ${lowStockOnly ? 'bg-[#fbe7e7] border-transparent text-[var(--color-warning-error)]' : 'bg-white border-black/10 text-black/55 hover:border-black/20'}`}
          >
            <AlertTriangle size={15} /> Low stock only
          </button>
        </div>

        {!rows ? (
          <LoadingScreen label="Loading inventory…" />
        ) : filtered.length ? (
          <div className="space-y-2.5">
            {filtered.map((it) => {
              const low = it.quantity <= it.reorder_level
              const expired = isExpired(it.expiry_date)
              const expiring = !expired && isExpiringSoon(it.expiry_date)
              return (
                <div key={it.id} className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-black/5 hover:border-[var(--color-primary)]/25 transition-colors">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${low ? 'bg-[#fbe7e7] text-[var(--color-warning-error)]' : 'bg-[var(--color-secondary)] text-[var(--color-primary)]'}`}>
                    <Package size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{it.name}</p>
                    <p className="text-xs text-black/40 truncate">
                      {it.category ? `${it.category[0].toUpperCase()}${it.category.slice(1)} · ` : ''}
                      {it.supplier_name ? `${it.supplier_name} · ` : ''}
                      {formatMoney(it.unit_price)} / {it.unit}
                      {it.expiry_date ? ` · Expires ${formatDate(it.expiry_date)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold tabular-nums ${low ? 'text-[var(--color-warning-error)]' : 'text-[var(--color-text)]'}`}>{it.quantity} {it.unit}</p>
                    <p className="text-xs text-black/35">Reorder at {it.reorder_level}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {low ? <Badge tone="danger">Low Stock</Badge> : null}
                    {expired ? <Badge tone="danger">Expired</Badge> : expiring ? <Badge tone="warning">Expiring Soon</Badge> : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" icon={SlidersHorizontal} onClick={() => setAdjusting(it)} aria-label="Adjust stock" />
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => { setEditing(it); setFormOpen(true) }} aria-label="Edit item" />
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRemoving(it)} aria-label="Remove item" className="hover:text-[var(--color-warning-error)]" />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title={search || category || lowStockOnly ? 'No items match your filters' : 'No inventory items yet'}
            message={search || category || lowStockOnly ? 'Try a different search term or filter.' : 'Add medicines, consumables and equipment to start tracking your clinic\'s stock.'}
            action={!search && !category && !lowStockOnly ? <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true) }}>Add Item</Button> : null}
          />
        )}
      </Card>

      <InventoryItemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        item={editing}
        suppliers={suppliers}
        onSaved={load}
        onSuppliersChanged={loadSuppliers}
      />
      <StockAdjustModal open={!!adjusting} onClose={() => setAdjusting(null)} item={adjusting} onSaved={load} />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
        loading={removeBusy}
        title="Remove this item?"
        message={removing ? `"${removing.name}" and its stock movement history will be permanently removed. This cannot be undone.` : ''}
        confirmLabel="Yes, remove item"
      />
    </div>
  )
}
