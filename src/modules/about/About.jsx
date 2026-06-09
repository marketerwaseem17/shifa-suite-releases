import { useEffect, useState } from 'react'
import { HeartPulse, Globe2, ShieldCheck, WifiOff, MessagesSquare, Sparkles, Phone } from 'lucide-react'
import { PageHeader } from '../../components/Misc'
import { Card } from '../../components/Card'
import Button from '../../components/Button'
import { api } from '../../lib/api'
import { SUPPORT_PHONE, SUPPORT_WA_URL } from '../../lib/support'

const PILLARS = [
  {
    icon: WifiOff,
    title: 'Works Fully Offline',
    body: 'No internet, no monthly cloud bills, no waiting for a server. Your clinic keeps running even when the connection doesn\'t.',
  },
  {
    icon: ShieldCheck,
    title: 'Your Data Stays Yours',
    body: 'Every patient record lives privately on your own computer. Nothing is uploaded anywhere unless you choose to back it up.',
  },
  {
    icon: Globe2,
    title: 'Built for Pakistani Clinics',
    body: 'Bilingual English / Roman Urdu interface, Pakistani phone formats, and a billing flow that matches how local clinics actually work.',
  },
  {
    icon: MessagesSquare,
    title: 'Zero-Cost WhatsApp Reminders',
    body: 'Send appointment reminders and follow-ups straight to WhatsApp using free wa.me links — no API keys, no per-message charges.',
  },
]

export default function About() {
  const [version, setVersion] = useState('')

  useEffect(() => { api.app.getVersion().then(setVersion) }, [])

  return (
    <div>
      <PageHeader
        title="About Shifa Suite"
        titleUrdu="Shifa Suite Ke Baray Mein"
      />

      <Card className="mb-5 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white border-transparent">
        <div className="flex flex-wrap items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <HeartPulse size={28} />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold font-[family-name:var(--font-heading)]">Shifa Suite{version ? <span className="text-white/60 font-medium text-base ml-2">v{version}</span> : null}</h2>
            <p className="text-white/85 mt-1 italic">"Ilaaj aap karein, baqi hum sambhalte hain"</p>
            <p className="text-white/70 text-sm mt-0.5">You focus on healing — we'll handle the rest.</p>
          </div>
        </div>
      </Card>

      <Card className="mb-5">
        <h3 className="font-semibold font-[family-name:var(--font-heading)] mb-2">Why Shifa Suite?</h3>
        <p className="text-sm text-black/60 leading-relaxed">
          Shifa Suite was built for solo doctors and small-to-mid clinics across Pakistan who deserve software that respects how they actually
          work — without expensive subscriptions, unreliable internet, or interfaces designed for hospitals ten times their size. From the
          moment a patient walks in to the moment their bill is settled and their reminder lands on WhatsApp, Shifa Suite keeps the whole day
          organised in one place — patients, appointments, prescriptions, lab orders, inventory, billing and reports — so you can spend less
          time on paperwork and more time on patient care.
        </p>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        {PILLARS.map((p) => {
          const Icon = p.icon
          return (
            <Card key={p.title} className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[var(--color-secondary)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                <Icon size={19} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{p.title}</p>
                <p className="text-sm text-black/50 mt-1 leading-relaxed">{p.body}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="bg-[var(--color-secondary)]/40 border-transparent flex flex-wrap items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-white text-[var(--color-accent)] flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">Questions, feedback, or need a hand getting set up?</p>
          <p className="text-sm text-black/55 mt-1">Our team replies on WhatsApp — usually within minutes during working hours.</p>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-success)] mt-1">
            <Phone size={13} /> {SUPPORT_PHONE}
          </p>
        </div>
        <Button variant="outline" onClick={() => api.app.openExternal(SUPPORT_WA_URL)}>Message Us on WhatsApp</Button>
      </Card>
    </div>
  )
}
