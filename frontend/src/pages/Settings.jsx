import { useEffect, useState } from 'react'
import { api } from '../api'
import { CheckIcon } from '../components/Icons'
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '../firebase'
import PasswordInput from '../components/PasswordInput'

export default function Settings({ nav }) {
  const [data, setData] = useState({ emailReminders: true, dataSharing: false, hasPin: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [pinMode, setPinMode] = useState(null)
  const [pinForm, setPinForm] = useState({ current: '', newPin: '', confirm: '' })
  const [resetMode, setResetMode] = useState(false)
  const [resetPin, setResetPin] = useState('')
  const [reauthPassword, setReauthPassword] = useState('')
  const [showReauth, setShowReauth] = useState(false)

  const [systemConfig, setSystemConfig] = useState(null)
  const [rateInput, setRateInput] = useState('')
  const [rateSaving, setRateSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/users/me'),
      api.get('/users/pin/status'),
      api.get('/system/config').catch(() => null),
    ]).then(([user, pin, sys]) => {
      setData({ emailReminders: user.emailReminders, dataSharing: user.dataSharing, hasPin: pin.hasPin })
      if (sys) {
        setSystemConfig(sys)
        setRateInput(String(sys.rbiBankRate))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function toggle(field, value) {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.patch('/users/me', { [field]: value })
      setData({ ...data, [field]: value })
      setSuccess('Settings saved')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePin(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (pinForm.newPin !== pinForm.confirm) return setError('New PINs do not match')
    if (!/^\d{4}$/.test(pinForm.newPin)) return setError('PIN must be exactly 4 digits')
    setSaving(true)
    try {
      await api.post('/users/pin/change', { currentPin: pinForm.current, newPin: pinForm.newPin })
      setSuccess('PIN changed successfully')
      setPinMode(null)
      setPinForm({ current: '', newPin: '', confirm: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleForgotPin() {
    setError('')
    setSuccess('')
    const email = auth.currentUser?.email
    if (!email) return setError('No email on account')
    setShowReauth(true)
  }

  async function handleReauthSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const email = auth.currentUser?.email
      if (!email) { setError('No email on account'); setSaving(false); return }

      const cred = EmailAuthProvider.credential(email, reauthPassword)
      await reauthenticateWithCredential(auth.currentUser, cred)
      setShowReauth(false)
      setReauthPassword('')
      setResetMode(true)
      setSaving(false)
    } catch {
      setError('Re-verification failed. Check your password.')
      setSaving(false)
    }
  }

  async function handleResetPin(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!/^\d{4}$/.test(resetPin)) return setError('PIN must be exactly 4 digits')
    setSaving(true)
    try {
      await api.post('/users/pin/reset', { pin: resetPin })
      setSuccess('PIN reset successfully')
      setResetMode(false)
      setResetPin('')
      setData({ ...data, hasPin: true })
      setPinMode(null)
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
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

      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Security</h2>
          {!resetMode ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">PIN Code</p>
                  <p className="text-xs text-slate-500">{data.hasPin ? 'PIN is set' : 'No PIN set'}</p>
                </div>
                <button
                  onClick={() => setPinMode(pinMode === 'change' ? null : 'change')}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  {data.hasPin ? 'Change' : 'Set Up'}
                </button>
              </div>

              {pinMode === 'change' && !showReauth && (
                <form onSubmit={handleChangePin} className="space-y-3 pt-2 border-t border-slate-100">
                  {data.hasPin && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Current PIN</label>
                      <input type="password" maxLength={4} inputMode="numeric" value={pinForm.current} onChange={e => setPinForm({ ...pinForm, current: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">New PIN</label>
                    <input type="password" maxLength={4} inputMode="numeric" value={pinForm.newPin} onChange={e => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Confirm New PIN</label>
                    <input type="password" maxLength={4} inputMode="numeric" value={pinForm.confirm} onChange={e => setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors">{saving ? 'Saving...' : 'Update PIN'}</button>
                    <button type="button" onClick={handleForgotPin} className="text-xs text-slate-400 hover:text-slate-600">Forgot PIN?</button>
                  </div>
                </form>
              )}

              {showReauth && (
                <form onSubmit={handleReauthSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password</label>
                    <PasswordInput
                      value={reauthPassword}
                      onChange={e => setReauthPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="max-w-64"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors">{saving ? 'Verifying...' : 'Verify Identity'}</button>
                    <button type="button" onClick={() => { setShowReauth(false); setReauthPassword('') }} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleResetPin} className="space-y-3">
              <p className="text-xs text-slate-600">Identity verified. Set a new 4-digit PIN.</p>
              <input type="password" maxLength={4} inputMode="numeric" value={resetPin} onChange={e => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <div className="flex items-center gap-2">
                <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors">{saving ? 'Saving...' : 'Set New PIN'}</button>
                <button type="button" onClick={() => setResetMode(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Notifications</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Email Reminders</p>
              <p className="text-xs text-slate-500">Receive invoice overdue reminders via email</p>
            </div>
            <button
              onClick={() => toggle('emailReminders', !data.emailReminders)}
              disabled={saving}
              className={`relative w-10 h-5 rounded-full transition-colors ${data.emailReminders ? 'bg-teal-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${data.emailReminders ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {systemConfig && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">RBI Bank Rate</h2>
            <p className="text-xs text-slate-500 mb-3">
              Used for interest calculations under Section 16 of the MSMED Act (3× this rate, compounded monthly).
              Last updated: {new Date(systemConfig.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
            </p>
            {systemConfig.rbiRateChangeFlagged && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-xs text-amber-800">
                  RBI Bank Rate may have changed (previous: {systemConfig.rbiRatePreviousValue}%).
                  Please verify and update the rate below.
                </p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="relative w-24">
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="50"
                  value={rateInput}
                  onChange={e => setRateInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
              <button
                onClick={async () => {
                  const val = parseFloat(rateInput)
                  if (isNaN(val) || val <= 0 || val > 50) return setError('Rate must be between 0 and 50')
                  setRateSaving(true)
                  setError('')
                  setSuccess('')
                  try {
                    const res = await api.patch('/system/config/bank-rate', { rbiBankRate: val })
                    setSystemConfig({ ...systemConfig, rbiBankRate: res.rbiBankRate, lastUpdated: res.lastUpdated, rbiRateChangeFlagged: false, rbiRatePreviousValue: null })
                    setSuccess(`Bank rate updated to ${val}%`)
                  } catch (err) {
                    setError(err.message)
                  } finally {
                    setRateSaving(false)
                  }
                }}
                disabled={rateSaving}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {rateSaving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Data Sharing</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Buyer Reliability Score</p>
              <p className="text-xs text-slate-500">Contribute anonymized payment data to help other MSMEs</p>
            </div>
            <button
              onClick={() => toggle('dataSharing', !data.dataSharing)}
              disabled={saving}
              className={`relative w-10 h-5 rounded-full transition-colors ${data.dataSharing ? 'bg-teal-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${data.dataSharing ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">Edit your business name, Udyam number, and contact details</p>
            </div>
            <button onClick={() => nav('profile')} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
