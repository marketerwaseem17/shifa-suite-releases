import { Inbox } from 'lucide-react'

export default function Table({ columns, rows, rowKey = 'id', onRowClick, emptyLabel = 'No records yet', emptyHint }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 text-black/35">
        <Inbox size={40} className="mb-3" />
        <p className="font-medium text-black/50">{emptyLabel}</p>
        {emptyHint ? <p className="text-sm mt-1 max-w-sm">{emptyHint}</p> : null}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[14px] border-collapse">
        <thead>
          <tr className="text-left text-black/45 border-b border-black/8">
            {columns.map((col) => (
              <th key={col.key} className={`px-3 py-2.5 font-semibold uppercase tracking-wide text-[11px] ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-black/5 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-[var(--color-secondary)]/60' : ''} transition-colors`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-3 py-3 align-middle ${col.className || ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, pageSize, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-4 text-sm text-black/50">
      <span>
        Showing {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded-lg border border-black/10 disabled:opacity-40 hover:bg-black/5"
        >
          Previous
        </button>
        <span className="px-2">Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded-lg border border-black/10 disabled:opacity-40 hover:bg-black/5"
        >
          Next
        </button>
      </div>
    </div>
  )
}
