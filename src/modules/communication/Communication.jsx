import { useEffect, useState, useCallback, useMemo } from 'react'
import { MessageCircle, Send, FileText, Plus, Pencil, Globe2, ExternalLink } from 'lucide-react'
import { PageHeader, Badge, EmptyState, LoadingScreen } from '../../components/Misc'
import { Card } from '../../components/Card'
import Button from '../../components/Button'
import SendReminderModal from './SendReminderModal'
import TemplateFormModal from './TemplateFormModal'
import { api } from '../../lib/api'
import { formatDateTime, initialsOf } from '../../lib/format'

const CATEGORY_TONES = {
  reminder: 'primary',
  'follow-up': 'accent',
  birthday: 'success',
  promo: 'warning',
}

export default function Communication() {
  const [tab, setTab] = useState('log')
  const [log, setLog] = useState(null)
  const [templates, setTemplates] = useState(null)
  const [clinicName, setClinicName] = useState('')
  const [sendOpen, setSendOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)

  const loadLog = useCallback(() => { api.communication.log({}).then(setLog) }, [])
  const loadTemplates = useCallback(() => { api.communication.templates().then(setTemplates) }, [])

  useEffect(() => { loadLog() }, [loadLog])
  useEffect(() => { loadTemplates() }, [loadTemplates])
  useEffect(() => { api.settings.getClinicProfile().then((p) => setClinicName(p?.clinic_name || '')) }, [])

  const grouped = useMemo(() => {
    if (!templates) return []
    const map = new Map()
    templates.forEach((t) => {
      if (!map.has(t.category)) map.set(t.category, [])
      map.get(t.category).push(t)
    })
    return [...map.entries()]
  }, [templates])

  return (
    <div>
      <PageHeader
        title="Communication"
        titleUrdu="Rabta — WhatsApp"
        subtitle="Send appointment reminders and follow-ups over WhatsApp — no API, no per-message cost, just one tap."
        actions={<Button icon={Send} onClick={() => setSendOpen(true)}>Send Reminder</Button>}
      />

      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-black/5 mb-5">
        <button
          onClick={() => setTab('log')}
          className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${tab === 'log' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-black/50 hover:text-black/70'}`}
        >
          Message Log
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${tab === 'templates' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-black/50 hover:text-black/70'}`}
        >
          Message Templates
        </button>
      </div>

      {tab === 'log' ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-[family-name:var(--font-heading)]">Recently Sent</h3>
            {log ? <p className="text-sm text-black/40">{log.length} message{log.length === 1 ? '' : 's'}</p> : null}
          </div>
          {!log ? (
            <LoadingScreen label="Loading message history…" />
          ) : log.length ? (
            <div className="space-y-2.5">
              {log.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-black/5">
                  <div className="w-10 h-10 rounded-full bg-[#e9fbe7] text-[var(--color-success)] flex items-center justify-center shrink-0">
                    <MessageCircle size={18} />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center text-sm font-semibold shrink-0">
                    {initialsOf(entry.patient_name || '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{entry.patient_name || 'Unknown patient'} · {entry.phone}</p>
                    <p className="text-xs text-black/40 truncate">{entry.message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone="success">Opened in WhatsApp</Badge>
                    <p className="text-xs text-black/35 mt-1">{formatDateTime(entry.sent_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="No messages sent yet"
              message="Send your first appointment reminder or follow-up — every message you open in WhatsApp is logged here."
              action={<Button icon={Send} onClick={() => setSendOpen(true)}>Send Reminder</Button>}
            />
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-[family-name:var(--font-heading)]">Your Message Templates</h3>
            <Button size="sm" icon={Plus} onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true) }}>New Template</Button>
          </div>
          {!templates ? (
            <LoadingScreen label="Loading templates…" />
          ) : templates.length ? (
            <div className="space-y-5">
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/35 mb-2">{category.replace('-', ' ')}</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {items.map((t) => (
                      <div key={t.id} className="p-4 rounded-xl border border-black/5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{t.name}</p>
                            <p className="text-xs text-black/40 inline-flex items-center gap-1 mt-0.5">
                              <Globe2 size={12} /> {t.language === 'roman-ur' ? 'Roman Urdu' : 'English'}
                              {t.is_default ? <Badge tone={CATEGORY_TONES[t.category] || 'neutral'}>Default</Badge> : null}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => { setEditingTemplate(t); setTemplateModalOpen(true) }} aria-label="Edit template" />
                        </div>
                        <p className="text-xs text-black/50 mt-2.5 line-clamp-3">{t.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No templates yet"
              message="Create reusable WhatsApp message templates with placeholders like patient name, date and time."
              action={<Button icon={Plus} onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true) }}>New Template</Button>}
            />
          )}
        </Card>
      )}

      <Card className="mt-5 flex items-center gap-4 bg-[var(--color-secondary)]/40 border-transparent">
        <div className="w-11 h-11 rounded-xl bg-white text-[var(--color-primary)] flex items-center justify-center shrink-0">
          <ExternalLink size={18} />
        </div>
        <p className="text-sm text-black/55">
          Shifa Suite uses WhatsApp's free <span className="font-semibold text-[var(--color-text)]">wa.me</span> links — your message opens directly in WhatsApp (Desktop or Web) with the patient's number and text pre-filled. You always review and tap send yourself, so there's no API cost and no risk of your number being blocked.
        </p>
      </Card>

      <SendReminderModal open={sendOpen} onClose={() => setSendOpen(false)} templates={templates || []} clinicName={clinicName} onSent={loadLog} />
      <TemplateFormModal open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} template={editingTemplate} onSaved={loadTemplates} />
    </div>
  )
}
