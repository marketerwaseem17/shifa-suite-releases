import { useEffect, useState, useCallback } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { api } from './lib/api'
import { LoadingScreen } from './components/Misc'
import AppShell from './components/AppShell'
import LicenseGate from './components/LicenseGate'
import Onboarding from './modules/onboarding/Onboarding'

import Dashboard from './modules/dashboard/Dashboard'
import Patients from './modules/patients/Patients'
import PatientProfile from './modules/patients/PatientProfile'
import Appointments from './modules/appointments/Appointments'
import Billing from './modules/billing/Billing'
import Prescriptions from './modules/prescriptions/Prescriptions'
import Lab from './modules/lab/Lab'
import Inventory from './modules/inventory/Inventory'
import Staff from './modules/staff/Staff'
import Reports from './modules/reports/Reports'
import Communication from './modules/communication/Communication'
import Settings from './modules/settings/Settings'
import About from './modules/about/About'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [clinic, setClinic] = useState(null)
  const [license, setLicense] = useState(null)

  const refresh = useCallback(async () => {
    const [clinicRes, licenseRes] = await Promise.all([
      api.settings.getClinicProfile(),
      api.license.getStatus(),
    ])
    setClinic(clinicRes)
    setLicense(licenseRes)
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  if (loading) return <LoadingScreen />

  if (!clinic || !clinic.onboarding_done) {
    return <Onboarding existing={clinic} onDone={refresh} />
  }

  if (license && license.state === 'expired') {
    return <LicenseGate license={license} onActivated={refresh} />
  }

  const currentUser = { full_name: 'Clinic Admin', role: 'admin' }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell clinic={clinic} license={license} user={currentUser} />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:id" element={<PatientProfile />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="billing" element={<Billing />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="lab" element={<Lab />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="staff" element={<Staff />} />
          <Route path="reports" element={<Reports />} />
          <Route path="communication" element={<Communication />} />
          <Route path="settings" element={<Settings clinic={clinic} license={license} onClinicSaved={refresh} onLicenseChanged={refresh} />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
