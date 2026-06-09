import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { TextField, TextArea, SelectField, Checkbox } from '../../components/Field'
import { api } from '../../lib/api'

const ROLES = [
  { value: 'doctor', label: 'Doctor — Doctor Sahab' },
  { value: 'receptionist', label: 'Receptionist — Reception Staff' },
  { value: 'admin', label: 'Admin / Manager' },
]

const empty = {
  full_name: '', username: '', password: '', role: 'receptionist',
  specialization: '', qualification: '', phone: '', shift_notes: '', active: true,
}

export default function StaffFormModal({ open, onClose, member, onSaved }) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(member ? { ...empty, ...member, password: '' } : empty)
    setError('')
  }, [member, open])

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Please enter the staff member\'s full name.'); return }
    if (!member && !form.username.trim()) { setError('Please choose a username for login.'); return }
    setSaving(true)
    setError('')
    try {
      const saved = member
        ? await api.staff.update({ ...form, id: member.id })
        : await api.staff.create(form)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this staff record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? `Edit Staff — ${member.full_name}` : 'Add Doctor / Staff Member'}
      subtitle={member ? `Username: ${member.username}` : 'Naya Staff Member — set their role, login and contact details'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : member ? 'Save Changes' : 'Add Staff Member'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <TextField label="Full Name" labelUrdu="Poora Naam" required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Dr. Ayesha Khan" />
        <SelectField label="Role" required options={ROLES} value={form.role} onChange={(e) => set('role', e.target.value)} />

        <TextField label="Username" required={!member} value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="e.g. dr.ayesha" disabled={Boolean(member)} hint={member ? 'Username cannot be changed after creation.' : 'Used to log in to Shifa Suite.'} />
        <TextField label={member ? 'New Password (optional)' : 'Password'} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={member ? 'Leave blank to keep current password' : 'Set a login password'} />

        {form.role === 'doctor' ? (
          <>
            <TextField label="Specialization" value={form.specialization} onChange={(e) => set('specialization', e.target.value)} placeholder="e.g. General Physician, Dermatologist" />
            <TextField label="Qualification" value={form.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="e.g. MBBS, FCPS (Medicine)" />
          </>
        ) : null}

        <TextField label="Phone Number" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" />
        <div className="flex items-end pb-2.5">
          <Checkbox label="Active" labelUrdu="Faal" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
        </div>

        <div className="sm:col-span-2">
          <TextArea label="Shift Notes / Schedule (optional)" rows={2} value={form.shift_notes} onChange={(e) => set('shift_notes', e.target.value)} placeholder="e.g. Mon–Fri mornings, alternates Saturdays" />
        </div>

        {error ? <p className="sm:col-span-2 text-sm text-[var(--color-warning-error)] font-medium">{error}</p> : null}
      </form>
    </Modal>
  )
}
