import { useState } from 'react'
import { reauthenticateWithCredential, EmailAuthProvider, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'
import PasswordInput from './PasswordInput'

export default function ForgotPin({ onBack, onComplete }) {
  const [method, setMethod] = useState(null)
  const [password, setPassword] = useState('')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePasswordVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const email = auth.currentUser?.email
      if (!email) throw new Error('No email on account')

      const cred = EmailAuthProvider.credential(email, password)
      await reauthenticateWithCredential(auth.currentUser, cred)
      setMethod('reset')
    } catch {
      setError('Verification failed. Please check your password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleReAuth() {
    setError('')
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
      setMethod('reset')
    } catch (err) {
      console.error('[Google re-auth]', err.code, err.message)
      setError('Google re-verification was cancelled or failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits')
      return
    }
    setLoading(true)
    try {
      await api.post('/users/pin/reset', { pin: newPin })
      onComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isGoogleUser = auth.currentUser?.providerData?.some(p => p.providerId === 'google.com')

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-80">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-sm font-bold text-white mx-auto mb-3">TL</div>
          <h1 className="text-lg font-semibold text-slate-900">
            {method === 'reset' ? 'Set New PIN' : 'Verify Your Identity'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {method === 'reset' ? 'Choose a new 4-digit PIN' : 'Re-verify your identity to reset your PIN'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-center">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {method === 'reset' ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New PIN</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                type="password"
                maxLength={4}
                inputMode="numeric"
                placeholder="Enter 4-digit PIN"
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Saving...' : 'Set New PIN'}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            {!isGoogleUser && (
              <>
                <form onSubmit={handlePasswordVerify} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Password</label>
                    <PasswordInput
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Verify with Password'}
                  </button>
                </form>
                <div className="flex items-center gap-3">
                  <span className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">or</span>
                  <span className="flex-1 h-px bg-slate-200" />
                </div>
              </>
            )}
            <button
              type="button"
              onClick={handleGoogleReAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {loading ? 'Connecting...' : 'Verify with Google'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2"
            >
              Back to PIN entry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
