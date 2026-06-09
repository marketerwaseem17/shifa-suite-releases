import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Receipt, FileText, UserCog,
  FlaskConical, Package, BarChart3, MessageCircle, Settings, Info, LifeBuoy,
} from 'lucide-react'
import { SUPPORT_PHONE, SUPPORT_WA_URL } from '../lib/support'
import { api } from '../lib/api'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', urdu: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/patients', label: 'Patients', urdu: 'Mareez', icon: Users },
  { to: '/appointments', label: 'Appointments', urdu: 'Appointments', icon: CalendarDays },
  { to: '/billing', label: 'Billing', urdu: 'Bill', icon: Receipt },
  { to: '/prescriptions', label: 'Prescriptions', urdu: 'Nuskha', icon: FileText },
  { to: '/lab', label: 'Lab & Diagnostics', urdu: 'Lab Tests', icon: FlaskConical },
  { to: '/inventory', label: 'Inventory', urdu: 'Stock', icon: Package },
  { to: '/staff', label: 'Doctors & Staff', urdu: 'Staff', icon: UserCog },
  { to: '/reports', label: 'Reports', urdu: 'Hisaab Kitaab', icon: BarChart3 },
  { to: '/communication', label: 'Communication', urdu: 'Paigham', icon: MessageCircle },
  { to: '/settings', label: 'Settings', urdu: 'Settings', icon: Settings },
  { to: '/about', label: 'About', urdu: 'Hamaray Baray Mein', icon: Info },
]

export default function Sidebar({ clinicName, logoSrc }) {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-black/5 flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-black/5">
        {logoSrc ? (
          <img src={logoSrc} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center font-bold font-[family-name:var(--font-heading)] shrink-0">
            S
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold font-[family-name:var(--font-heading)] text-[var(--color-primary)] leading-tight truncate">
            {clinicName || 'Shifa Suite'}
          </p>
          <p className="text-[11px] text-black/40 truncate">Ilaaj aap karein, baqi hum sambhalte hain</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, urdu, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-control)] text-[15px] font-medium transition-colors
              ${isActive
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text)]/75 hover:bg-[var(--color-secondary)]'}`
            }
          >
            <Icon size={19} />
            <span className="truncate">{label}</span>
            {urdu && urdu !== label ? <span className="ml-auto text-xs opacity-60 truncate">{urdu}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <button
          onClick={() => api.app.openExternal(SUPPORT_WA_URL)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[var(--radius-control)] text-[13px] font-semibold text-[var(--color-success)] hover:bg-[#e9fbe7] transition-colors"
        >
          <LifeBuoy size={16} />
          <span>Help & Support</span>
          <span className="ml-auto text-[11px] font-normal opacity-70">{SUPPORT_PHONE}</span>
        </button>
      </div>
      <div className="px-5 py-3 border-t border-black/5 text-[11px] text-black/35">
        Shifa Suite v1.0 · Built in Peshawar 🇵🇰
      </div>
    </aside>
  )
}
