import { useEffect, useState } from 'react'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import Button from '../../components/Button'
import { Card } from '../../components/Card'
import { TextField, TextArea, SelectField } from '../../components/Field'
import { CLINIC_TYPES } from '../onboarding/Onboarding'
import { api } from '../../lib/api'

const emptyDoctor = { name: '', qualification: '', specialization: '' }

export default function ClinicProfileForm({ clinic, onSaved }) {
  const [logo, setLogo] = useState(clinic?.logoDataUrl ? { path: clinic.logo_path, dataUrl: clinic.logoDataUrl } : null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState(() => ({
    clinic_name: clinic?.clinic_name || '',
    tagline: clinic?.tagline || '',
    clinic_type: clinic?.clinic_type || '',
    address: clinic?.address || '',
    city: clinic?.city || '',
    maps_link: clinic?.maps_link || '',
    phone: clinic?.phone || '',
    whatsapp: clinic?.whatsapp || '',
    email: clinic?.email || '',
    registration_no: clinic?.registration_no || '',
    doctors: clinic?.doctors?.length ? clinic.doctors : [{ ...emptyDoctor }],
    timingsText: clinic?.timings?.text || '',
  }))

  useEffect(() => { setSuccess(false) }, [form])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  function setDoctor(idx, field, value) {
    setForm((f) => {
      const doctors = [...f.doctors]
      doctors[idx] = { ...doctors[idx], [field]: value }
      return { ...f, doctors }
    })
  }
  function addDoctor() { setForm((f) => ({ ...f, doctors: [...f.doctors, { ...emptyDoctor }] })) }
  function removeDoctor(idx) { setForm((f) => ({ ...f, doctors: f.doctors.filter((_, i) => i !== idx) })) }

  async function handleLogoUpload() {
    const res = await api.settings.uploadLogo()
    if (res) setLogo({ path: res.logo_path, dataUrl: res.logoDataUrl })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.clinic_name.trim()) { setError('Please enter your clinic name.'); return }
    if (!form.address.trim()) { setError('Please enter your clinic address.'); return }
    if (!form.phone.trim() && !form.whatsapp.trim()) { setError('Please provide at least one contact number.'); return }
    setSaving(true)
    setError('')
    try {
      await api.settings.saveClinicProfile({
        clinic_name: form.clinic_name.trim(),
        tagline: form.tagline.trim(),
        clinic_type: form.clinic_type,
        logo_path: logo?.path || null,
        address: form.address.trim(),
        city: form.city.trim(),
        maps_link: form.maps_link.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        registration_no: form.registration_no.trim(),
        doctors: form.doctors.filter((d) => d.name.trim()),
        timings: { text: form.timingsText },
        language: clinic?.language || 'en',
        onboarding_done: true,
      })
      setSuccess(true)
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not save your clinic profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-4">Clinic Identity</h3>
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="shrink-0">
            <span className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Clinic Logo</span>
            <button type="button" onClick={handleLogoUpload}
              className="w-28 h-28 rounded-2xl border-2 border-dashed border-black/15 hover:border-[var(--color-primary)]/50 flex items-center justify-center overflow-hidden transition-colors bg-[var(--color-secondary)]/30">
              {logo?.dataUrl ? <img src={logo.dataUrl} alt="Clinic logo" className="w-full h-full object-contain p-2" /> : <ImagePlus className="text-black/30" size={26} />}
            </button>
            <p className="text-xs text-black/35 mt-1.5 max-w-[7rem]">Shown on invoices & prescriptions</p>
          </div>
          <div className="flex-1 grid sm:grid-cols-2 gap-4">
            <TextField label="Clinic Name" required value={form.clinic_name} onChange={(e) => set('clinic_name', e.target.value)} />
            <TextField label="Tagline (optional)" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Ilaaj aap karein, baqi hum sambhalte hain" />
            <SelectField label="Clinic Type" options={CLINIC_TYPES} value={form.clinic_type} onChange={(e) => set('clinic_type', e.target.value)} className="sm:col-span-2" />
            <TextField label="Registration No. (optional)" value={form.registration_no} onChange={(e) => set('registration_no', e.target.value)} />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-4">Contact & Location</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" />
          <TextField label="WhatsApp Number" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="03xx-xxxxxxx" />
          <TextField label="Email (optional)" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <TextField label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <TextArea label="Address" required rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} className="sm:col-span-2" />
          <TextField label="Google Maps Link (optional)" value={form.maps_link} onChange={(e) => set('maps_link', e.target.value)} className="sm:col-span-2" />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold font-[family-name:var(--font-heading)]">Doctors at this Clinic</h3>
          <Button type="button" size="sm" variant="outline" icon={Plus} onClick={addDoctor}>Add Doctor</Button>
        </div>
        <div className="space-y-3">
          {form.doctors.map((d, idx) => (
            <div key={idx} className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-3 rounded-xl bg-[var(--color-secondary)]/30">
              <TextField label="Name" value={d.name} onChange={(e) => setDoctor(idx, 'name', e.target.value)} placeholder="Dr. …" />
              <TextField label="Qualification" value={d.qualification} onChange={(e) => setDoctor(idx, 'qualification', e.target.value)} placeholder="MBBS, FCPS" />
              <TextField label="Specialization" value={d.specialization} onChange={(e) => setDoctor(idx, 'specialization', e.target.value)} placeholder="General Physician" />
              <Button type="button" variant="ghost" icon={Trash2} onClick={() => removeDoctor(idx)} disabled={form.doctors.length === 1} aria-label="Remove doctor" />
            </div>
          ))}
        </div>
        <TextArea label="Clinic Timings (optional)" className="mt-4" rows={2} value={form.timingsText} onChange={(e) => set('timingsText', e.target.value)} placeholder={'Mon–Sat: 10:00 AM – 8:00 PM\nFriday: Closed for Jumma (1:00 PM – 3:00 PM)'} />
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save Clinic Profile'}</Button>
        {success ? <span className="text-sm text-[var(--color-success)] font-medium">Saved successfully.</span> : null}
        {error ? <span className="text-sm text-[var(--color-warning-error)] font-medium">{error}</span> : null}
      </div>
    </form>
  )
}
