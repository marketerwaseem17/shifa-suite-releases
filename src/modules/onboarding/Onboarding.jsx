import { useState } from 'react'
import { Stethoscope, Building2, Phone, Clock3, ImagePlus, CheckCircle2, ArrowRight, ArrowLeft, MessageCircle } from 'lucide-react'
import Button from '../../components/Button'
import { Card } from '../../components/Card'
import { TextField, TextArea, SelectField } from '../../components/Field'
import { api } from '../../lib/api'
import { SUPPORT_PHONE, SUPPORT_WA_URL } from '../../lib/support'
import InvoicePreview from './InvoicePreview'

export const CLINIC_TYPES = [
  { value: 'general', label: 'General Physician / Family Medicine' },
  { value: 'dental', label: 'Dental Clinic' },
  { value: 'physiotherapy', label: 'Physiotherapy Clinic' },
  { value: 'dermatology', label: 'Dermatology / Skin Clinic' },
  { value: 'gynecology', label: 'Gynecology / Maternity' },
  { value: 'pediatric', label: 'Pediatric Clinic' },
  { value: 'ent', label: 'ENT (Ear, Nose, Throat)' },
  { value: 'eye', label: 'Eye / Ophthalmology Clinic' },
  { value: 'orthopedic', label: 'Orthopedic Clinic' },
  { value: 'cardiology', label: 'Cardiology Clinic' },
  { value: 'psychiatry', label: 'Psychiatry / Mental Health Clinic' },
  { value: 'diagnostic', label: 'Diagnostic / Lab Center' },
  { value: 'multispecialty', label: 'Multi-specialty Clinic / Hospital' },
  { value: 'other', label: 'Other' },
]

const STEPS = ['Clinic Identity', 'Contact & Location', 'Doctors & Timings', 'Preview & Finish']

const emptyDoctor = { name: '', qualification: '', specialization: '' }

export default function Onboarding({ existing, onDone }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [logo, setLogo] = useState(existing?.logoDataUrl ? { path: existing.logo_path, dataUrl: existing.logoDataUrl } : null)

  const [form, setForm] = useState(() => ({
    clinic_name: existing?.clinic_name || '',
    tagline: existing?.tagline || '',
    clinic_type: existing?.clinic_type || '',
    address: existing?.address || '',
    city: existing?.city || '',
    maps_link: existing?.maps_link || '',
    phone: existing?.phone || '',
    whatsapp: existing?.whatsapp || '',
    email: existing?.email || '',
    registration_no: existing?.registration_no || '',
    doctors: existing?.doctors?.length ? existing.doctors : [{ ...emptyDoctor }],
    timingsText: existing?.timings?.text || 'Mon–Sat: 10:00 AM – 8:00 PM\nFriday: Closed for Jumma (1:00 PM – 3:00 PM)',
  }))

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function setDoctor(idx, field, value) {
    setForm((f) => {
      const doctors = [...f.doctors]
      doctors[idx] = { ...doctors[idx], [field]: value }
      return { ...f, doctors }
    })
  }

  function addDoctor() {
    setForm((f) => ({ ...f, doctors: [...f.doctors, { ...emptyDoctor }] }))
  }

  function removeDoctor(idx) {
    setForm((f) => ({ ...f, doctors: f.doctors.filter((_, i) => i !== idx) }))
  }

  async function handleLogoUpload() {
    const res = await api.settings.uploadLogo()
    if (res) setLogo({ path: res.logo_path, dataUrl: res.logoDataUrl })
  }

  function validateStep(idx) {
    if (idx === 0) {
      if (!form.clinic_name.trim()) return 'Please enter your clinic name.'
      if (!form.clinic_type) return 'Please select your clinic type — this helps us tailor the app for you.'
      if (!logo) return 'Please upload a clinic logo — it will appear on every invoice and prescription.'
    }
    if (idx === 1) {
      if (!form.address.trim()) return 'Please enter your clinic address.'
      if (!form.phone.trim() && !form.whatsapp.trim()) return 'Please provide at least one contact number.'
    }
    return ''
  }

  function next() {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError('')
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  function back() {
    setError('')
    setStep((s) => Math.max(0, s - 1))
  }

  async function finish() {
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
        language: 'en',
        onboarding_done: true,
      })
      onDone?.()
    } catch (e) {
      setError(e.message || 'Could not save clinic profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-secondary)] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-[var(--color-primary)] font-bold text-2xl font-[family-name:var(--font-heading)]">
            <Stethoscope size={28} /> Shifa Suite
          </div>
          <p className="text-black/45 text-sm mt-1">Let's set up your clinic — this only takes a couple of minutes, and you'll never have to type this again.</p>
          <button
            onClick={() => api.app.openExternal(SUPPORT_WA_URL)}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-success)] font-medium mt-2 hover:underline"
          >
            <MessageCircle size={13} /> Need help? WhatsApp: {SUPPORT_PHONE}
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${idx < step ? 'bg-[var(--color-success)] text-white' : idx === step ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-black/30 border border-black/10'}`}>
                {idx < step ? <CheckCircle2 size={18} /> : idx + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${idx === step ? 'font-semibold text-[var(--color-text)]' : 'text-black/40'}`}>{label}</span>
              {idx < STEPS.length - 1 ? <div className="w-8 h-px bg-black/10" /> : null}
            </div>
          ))}
        </div>

        <Card className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <div>
            {step === 0 ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Building2 size={20} className="text-[var(--color-primary)]" /> Clinic Identity</h3>
                <TextField label="Clinic Name" labelUrdu="Clinic ka naam" required value={form.clinic_name} onChange={(e) => set('clinic_name', e.target.value)} placeholder="e.g. Al-Shifa Family Clinic" />
                <TextField label="Tagline / Motto (optional)" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="e.g. Aap ki sehat, hamari zimmedari" />
                <SelectField
                  label="Clinic Type / Specialization"
                  labelUrdu="Clinic ki qisam"
                  required
                  placeholder="Select your clinic's specialization"
                  options={CLINIC_TYPES}
                  value={form.clinic_type}
                  onChange={(e) => set('clinic_type', e.target.value)}
                  hint="This helps Shifa Suite tailor templates and terminology to your practice — you can change it later in Settings."
                />
                <div>
                  <span className="block text-sm font-semibold mb-1.5">Clinic Logo <span className="text-[var(--color-warning-error)]">*</span></span>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-black/15 flex items-center justify-center overflow-hidden bg-[var(--color-secondary)]/50 shrink-0">
                      {logo ? <img src={logo.dataUrl} alt="Clinic logo" className="w-full h-full object-cover" /> : <ImagePlus className="text-black/25" size={26} />}
                    </div>
                    <div>
                      <Button type="button" variant="outline" size="sm" onClick={handleLogoUpload}>{logo ? 'Change Logo' : 'Upload Logo'}</Button>
                      <p className="text-xs text-black/40 mt-1.5">PNG or JPG. We'll automatically fit it to invoices, prescriptions and reports.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Phone size={20} className="text-[var(--color-primary)]" /> Contact & Location</h3>
                <TextArea label="Address" labelUrdu="Pata" required rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, area, city" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <TextField label="City" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Peshawar" />
                  <TextField label="Google Maps Link (optional)" value={form.maps_link} onChange={(e) => set('maps_link', e.target.value)} placeholder="https://maps.google.com/…" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <TextField label="Phone Number" required value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" />
                  <TextField label="WhatsApp Number" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="03xx-xxxxxxx (for reminders)" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <TextField label="Email (optional)" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="clinic@example.com" />
                  <TextField label="Registration / License No. (optional)" value={form.registration_no} onChange={(e) => set('registration_no', e.target.value)} />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Stethoscope size={20} className="text-[var(--color-primary)]" /> Doctors & Timings</h3>
                <div className="space-y-3">
                  {form.doctors.map((doc, idx) => (
                    <div key={idx} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end p-3 rounded-xl bg-[var(--color-secondary)]/40">
                      <TextField label={`Doctor ${idx + 1} Name`} value={doc.name} onChange={(e) => setDoctor(idx, 'name', e.target.value)} placeholder="Dr. Ali Raza" />
                      <TextField label="Qualification / Specialization" value={doc.qualification} onChange={(e) => setDoctor(idx, 'qualification', e.target.value)} placeholder="MBBS, FCPS (Medicine)" />
                      {form.doctors.length > 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeDoctor(idx)}>Remove</Button>
                      ) : <span />}
                    </div>
                  ))}
                  <Button type="button" variant="secondary" size="sm" onClick={addDoctor}>+ Add another doctor</Button>
                </div>
                <TextArea
                  label="Clinic Timings"
                  labelUrdu="Clinic ka waqt"
                  rows={3}
                  value={form.timingsText}
                  onChange={(e) => set('timingsText', e.target.value)}
                  hint="Shown on the waiting room display and printed materials."
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Clock3 size={20} className="text-[var(--color-primary)]" /> Review & Finish</h3>
                <p className="text-sm text-black/55">
                  This is how your clinic details will appear on every invoice, prescription and report — no need to retype anything later.
                  You can always update this from <strong>Admin & Settings → Clinic Profile</strong>.
                </p>
                <ul className="text-sm space-y-1 text-black/65">
                  <li><strong>{form.clinic_name}</strong> {form.tagline ? `— ${form.tagline}` : ''}</li>
                  <li>{CLINIC_TYPES.find((t) => t.value === form.clinic_type)?.label}</li>
                  <li>{form.address}{form.city ? `, ${form.city}` : ''}</li>
                  <li>{[form.phone, form.whatsapp ? `WhatsApp: ${form.whatsapp}` : null].filter(Boolean).join('  ·  ')}</li>
                  <li>{form.doctors.filter((d) => d.name).map((d) => `${d.name}${d.qualification ? ` (${d.qualification})` : ''}`).join('   |   ')}</li>
                </ul>
              </div>
            ) : null}

            {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium mt-4">{error}</p> : null}

            <div className="flex items-center justify-between mt-6">
              <Button variant="ghost" onClick={back} disabled={step === 0} icon={ArrowLeft}>Back</Button>
              {step < STEPS.length - 1 ? (
                <Button variant="primary" onClick={next} iconRight={ArrowRight}>Continue</Button>
              ) : (
                <Button variant="accent" onClick={finish} disabled={saving}>{saving ? 'Saving…' : 'Finish Setup & Launch Shifa Suite'}</Button>
              )}
            </div>
          </div>

          <InvoicePreview clinic={{ ...form, logoDataUrl: logo?.dataUrl }} />
        </Card>
      </div>
    </div>
  )
}
