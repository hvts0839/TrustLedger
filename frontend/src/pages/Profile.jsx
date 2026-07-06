import { useEffect, useState } from 'react'
import { api } from '../api'
import { auth } from '../firebase'
import { UserIcon, CheckIcon } from '../components/Icons'

const UDYAM_REGEX = /^UDYAM-\w{2}-\d{2}-\d{7}$/

export default function Profile({ nav: _nav, isNewUser, onComplete }) {
  const [form, setForm] = useState({ name: '', companyName: '', udyamNumber: '', email: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    api.get('/users/me').then(data => {
      setForm({
        name: data.name || auth.currentUser?.displayName || '',
        companyName: data.companyName || '',
        udyamNumber: data.udyamNumber || '',
        email: data.email || auth.currentUser?.email || '',
        phone: data.phone || '',
      })
      setLoading(false)
    }).catch(() => {
      setForm({ name: auth.currentUser?.displayName || '', companyName: '', udyamNumber: '', email: auth.currentUser?.email || '', phone: '' })
      setLoading(false)
    })
  }, [])

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    if (fieldErrors[field]) setFieldErrors({ ...fieldErrors, [field]: '' })
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.companyName.trim()) errs.companyName = 'Company name is required'
    if (form.udyamNumber.trim() && !UDYAM_REGEX.test(form.udyamNumber.trim())) {
      errs.udyamNumber = 'Enter a valid Udyam number (e.g. UDYAM-XX-00-0000000)'
    }
    if (isNewUser) {
      if (!form.phone.trim()) errs.phone = 'Phone number is required'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!validate()) return

    setSaving(true)
    try {
      await api.patch('/users/me', { ...form, profileComplete: true })
      setSuccess('Profile saved successfully')
      if (isNewUser && onComplete) {
        setTimeout(() => onComplete(), 800)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
            <UserIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-teal-800">Welcome to TrustLedger!</p>
            <p className="text-xs text-teal-600 mt-0.5">Please complete your profile to get started. This is a one-time step.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <UserIcon />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Complete Your Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">All fields are required</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
          <CheckIcon />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition ${fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
              placeholder="Your full name"
              value={form.name}
              onChange={set('name')}
            />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company / Business Name <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition ${fieldErrors.companyName ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
              placeholder="e.g. ABC Engineering Works"
              value={form.companyName}
              onChange={set('companyName')}
            />
            {fieldErrors.companyName && <p className="text-xs text-red-500 mt-1">{fieldErrors.companyName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Udyam Registration Number
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition ${fieldErrors.udyamNumber ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
              placeholder="UDYAM-XX-00-0000000"
              value={form.udyamNumber}
              onChange={set('udyamNumber')}
            />
            {fieldErrors.udyamNumber && <p className="text-xs text-red-500 mt-1">{fieldErrors.udyamNumber}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition ${fieldErrors.phone ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={set('phone')}
            />
            {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
              type="email"
              value={form.email}
              disabled
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-sm"
        >
          {saving ? 'Saving...' : 'Complete Profile'}
        </button>
      </form>
    </div>
  )
}
