import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea, SelectField } from '../../components/Field'
import { api } from '../../lib/api'

const CATEGORIES = [
  { value: 'reminder', label: 'Appointment Reminder' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'birthday', label: 'Birthday Greeting' },
  { value: 'promo', label: 'Promotion / Announcement' },
]

const LANGUAGES = [
  { value: 'roman-ur', label: 'Roman Urdu' },
  { value: 'en', label: 'English' },
]

const TOKENS = ['{{patient_name}}', '{{date}}', '{{time}}', '{{clinic_name}}']

function emptyForm() {
  return { name: '', category: 'reminder', language: 'roman-ur', body: '' }
}

export default function TemplateFormModal({ open, onClose, template, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (template) {
      setForm({ name: template.name, category: template.category, language: template.language, body: template.body })
    } else {
      setForm(emptyForm())
    }
    setError('')
  }, [template, open])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  function insertToken(token) {
    set('body', `${form.body}${form.body && !form.body.endsWith(' ') ? ' ' : ''}${token}`)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Please give this template a name.'); return }
    if (!form.body.trim()) { setError('Please write the message body.'); return }
    setSaving(true)
    setError('')
    try {
      const saved = await api.communication.saveTemplate({
        id: template?.id,
        name: form.name.trim(),
        category: form.category,
        language: form.language,
        body: form.body.trim(),
      })
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this template.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template ? 'Edit Message Template' : 'New Message Template'}
      subtitle="Naya Template — reusable WhatsApp messages with placeholders that auto-fill per patient"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : template ? 'Save Changes' : 'Create Template'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField label="Template Name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Eid Greeting — Roman Urdu" />

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField label="Category" options={CATEGORIES} value={form.category} onChange={(e) => set('category', e.target.value)} />
          <SelectField label="Language" options={LANGUAGES} value={form.language} onChange={(e) => set('language', e.target.value)} />
        </div>

        <div>
          <span className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
            Message Body <span className="text-[var(--color-warning-error)]">*</span>
          </span>
          <TextArea required rows={5} value={form.body} onChange={(e) => set('body', e.target.value)} placeholder="Assalam-o-Alaikum {{patient_name}}, …" />
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-black/40 mr-1">Insert placeholder:</span>
            {TOKENS.map((t) => (
              <button key={t} type="button" onClick={() => insertToken(t)}
                className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary-dark)] hover:bg-[#d8ecef] transition-colors font-mono">
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-black/35 mt-1.5">These are automatically replaced with the patient's name, appointment date/time, and your clinic's name when the message is sent.</p>
        </div>

        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
