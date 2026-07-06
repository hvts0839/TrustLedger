import { useState, useEffect } from 'react'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '../firebase'
import PasswordInput from '../components/PasswordInput'

export default function ResetPassword() {
  const [oobCode, setOobCode] = useState('')
  const [valid, setValid] = useState(null)
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('oobCode')
    const mode = params.get('mode')
    if (mode === 'resetPassword' && code) {
      setOobCode(code)
      verifyPasswordResetCode(auth, code)
        .then(email => {
          setEmail(email)
          setValid(true)
          setChecking(false)
        })
        .catch(() => {
          setValid(false)
          setChecking(false)
        })
    } else {
      setValid(false)
      setChecking(false)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await confirmPasswordReset(auth, oobCode, newPassword)
      setSuccess(true)
    } catch (err) {
      const code = err.code?.match(/auth\/(\w+)/)?.[1]
      if (code === 'expired-action-code') {
        setError('This reset link has expired. Please request a new one.')
      } else if (code === 'invalid-action-code') {
        setError('This reset link is invalid. Please request a new one.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Password Reset Complete</h1>
          <p className="text-sm text-slate-500 mb-6">Your password has been reset successfully. You can now sign in with your new password.</p>
          <a href="/" className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-sm font-bold text-white mx-auto mb-3">TL</div>
          <h1 className="text-lg font-semibold text-slate-900">
            {checking ? 'Checking link...' : valid ? 'Reset Your Password' : 'Invalid Link'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {checking ? 'Please wait...' : valid ? `Set a new password for ${email}` : 'This password reset link is invalid or has expired.'}
          </p>
        </div>

        {checking ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : valid ? (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <PasswordInput
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-6">Please request a new password reset link from the login page.</p>
            <a href="/" className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors">
              Go to Login
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
