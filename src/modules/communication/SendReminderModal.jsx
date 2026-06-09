import { useEffect, useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea, SelectField } from '../../components/Field'
import PatientPicker from '../../components/PatientPicker'
import { api } from '../../lib/api'
import { todayISO } from '../../lib/format'

function fillPreview(body, tokens) {
  return (body || '').replace(/\{\{(\w+)\}\}/g, (_, key) => (tokens[key] != null && tokens[key] !== '' ? tokens[key] : `[${key}]`))
}

export default function SendReminderModal({ open, onClose, templates, clinicName, onSent }) {
  const [patient, setPatient] = useState(null)
  const [templateId, setTemplateId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setPatient(null)
      setTemplateId(templates[0] ? String(templates[0].id) : '')
      setDate(todayISO())
      setTime('')
      setCustomMessage('')
      setError('')
    }
  }, [open, templates])

  const template = useMemo(() => templates.find((t) => String(t.id) === templateId) || null, [templates, templateId])
  const isCustom = templateId === 'custom'

  const preview = useMemo(() => {
    const body = isCustom ? customMessage : (template?.body || '')
    return fillPreview(body, {
      patient_name: patient?.full_name || '',
      date,
      time,
      clinic_name: clinicName || 'the clinic',
    })
  }, [isCustom, customMessage, template, patient, date, time, clinicName])

  const templateOptions = [...templates.map((t) => ({ value: String(t.id), label: `${t.name} (${t.language === 'roman-ur' ? 'Roman Urdu' : 'English'})` })), { value: 'custom', label: 'Write a custom message…' }]

  async function handleSend(e) {
    e.preventDefault()
    if (!patient) { setError('Please select the patient to message.'); return }
    if (!patient.phone) { setError('This patient has no phone number on file — add one to their profile first.'); return }
    if (isCustom && !customMessage.trim()) { setError('Please write your message.'); return }
    setSending(true)
    setError('')
    try {
      await api.communication.sendReminder({
        patient_id: patient.id,
        template_id: isCustom ? null : (template?.id || null),
        message: isCustom ? customMessage.trim() : null,
        date,
        time,
        phone: patient.phone,
      })
      onSent?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not open WhatsApp for this message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send WhatsApp Reminder"
      subtitle="Paigham Bhejein — opens WhatsApp with your message pre-filled, ready to send"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={MessageCircle} onClick={handleSend} disabled={sending}>{sending ? 'Opening WhatsApp…' : 'Open in WhatsApp'}</Button>
        </>
      }
    >
      <form onSubmit={handleSend} className="space-y-4">
        <PatientPicker patient={patient} onChange={setPatient} />
        {patient && !patient.phone ? (
          <p className="text-sm text-[var(--color-warning-error)] font-medium -mt-2">This patient has no phone number on file.</p>
        ) : null}

        <SelectField label="Message Template" options={templateOptions} value={templateId} onChange={(e) => setTemplateId(e.target.value)} />

        {isCustom ? (
          <TextArea label="Your Message" rows={4} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Type your message — you can still use {{patient_name}}, {{date}}, {{time}} and {{clinic_name}}." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField label="Appointment Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <TextField label="Appointment Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        )}

        <div>
          <span className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">Message Preview</span>
          <div className="p-3.5 rounded-xl bg-[#e9fbe7] border border-[#d3f3cf] text-sm text-[var(--color-text)] whitespace-pre-wrap">
            {preview || <span className="text-black/35">Your message preview will appear here…</span>}
          </div>
        </div>

        {error ? <p className="text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
