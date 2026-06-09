import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const TITLES = {
  '/': 'Dashboard',
  '/patients': 'Patient Management',
  '/appointments': 'Appointments & Scheduling',
  '/billing': 'Billing & Invoicing',
  '/prescriptions': 'E-Prescriptions',
  '/lab': 'Lab & Diagnostics',
  '/inventory': 'Inventory Management',
  '/staff': 'Doctors & Staff',
  '/reports': 'Financial & Reports',
  '/communication': 'Communication',
  '/settings': 'Admin & Settings',
  '/about': 'About Shifa Suite',
}

function titleFor(pathname) {
  if (TITLES[pathname]) return TITLES[pathname]
  const base = '/' + pathname.split('/')[1]
  return TITLES[base] || 'Shifa Suite'
}

export default function AppShell({ clinic, license, user }) {
  const location = useLocation()
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-secondary)]">
      <Sidebar clinicName={clinic?.clinic_name} logoSrc={clinic?.logoDataUrl} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={titleFor(location.pathname)} license={license} user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
