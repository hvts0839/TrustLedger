import { useState, useEffect, useRef } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'
import PasswordInput from '../components/PasswordInput'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

function friendlyFirebaseError(raw) {
  const clean = raw.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim()
  const code = raw.match(/\(auth\/(\w+)\)/)?.[1]
  if (code === 'user-not-found' || code === 'wrong-password' || code === 'invalid-credential') {
    return 'Incorrect email or password.'
  }
  if (code === 'too-many-requests') {
    return 'Too many attempts. Please try again later.'
  }
  if (code === 'invalid-email') {
    return 'Please enter a valid email address.'
  }
  return clean || 'Something went wrong. Please try again.'
}

export default function Login({ initialMode, onBack, onSwitchToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(initialMode === 'register')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [captchaRequired, setCaptchaRequired] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef(null)
  const captchaWidgetId = useRef(null)
  const captchaReady = useRef(false)

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || captchaReady.current) return
    const s = document.createElement('script')
    s.src = `https://www.google.com/recaptcha/api.js?render=explicit`
    s.async = true
    s.defer = true
    s.onload = () => { captchaReady.current = true }
    document.head.appendChild(s)
    return () => { captchaReady.current = false }
  }, [])

  useEffect(() => {
    if (captchaRequired && captchaReady.current && captchaRef.current && captchaWidgetId.current === null) {
      captchaWidgetId.current = window.grecaptcha.render(captchaRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
      })
    }
  }, [captchaRequired])

  const switchMode = (val) => { setIsRegister(val); setError(''); setResetEmailSent(false); setCaptchaRequired(false) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResetEmailSent(false)

    if (!isRegister) {
      const check = await api.post('/users/check-lockout', { email }).catch(() => ({ locked: false, captchaRequired: false }))
      if (check.locked) {
        const mins = check.remainingMinutes || 30
        setError(`Too many failed attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}, or use "Forgot Password" to reset.`)
        return
      }
      if (check.captchaRequired) {
        setCaptchaRequired(true)
      }
    }

    if (!isRegister && captchaRequired) {
      if (!captchaToken) {
        setError('Please complete the security check.')
        setSubmitting(false)
        return
      }
      const verified = await api.post('/users/verify-captcha', { token: captchaToken }).catch(() => null)
      if (!verified || !verified.ok) {
        setError('Security check failed. Please try again.')
        setSubmitting(false)
        return
      }
    }

    setSubmitting(true)
    try {
      if (!isRegister) {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      }

      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password)
        await api.post('/users/me', { email, authProvider: 'email' })
        await api.post('/users/send-otp', { email })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }

      if (!isRegister) {
        api.post('/users/reset-attempts', { email }).catch(() => {})
      }
    } catch (err) {
      if (!isRegister) {
        api.post('/users/record-failed-attempt', { email }).catch(() => {})
      }
      setError(friendlyFirebaseError(err.message))
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setGoogleLoading(true)
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)

      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    } catch (err) {
      console.error('[Google sign-in]', err.code, err.message)
      setError(friendlyFirebaseError(err.message))
      setGoogleLoading(false)
    }
  }

  async function handleForgotPassword() {
    setError('')
    setResetEmailSent(false)
    if (!email) {
      setError('Please enter your email address first.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      setResetEmailSent(true)
    } catch (err) {
      const code = err.code?.match(/auth\/(\w+)/)?.[1]
      if (code === 'too-many-requests') {
        setError('Too many requests. Please try again later.')
      } else if (code === 'user-not-found') {
        setResetEmailSent(true)
      } else if (code === 'invalid-email') {
        setError('Please enter a valid email address.')
      } else {
        console.error('[ForgotPassword] Error:', err.code || err.message)
        setResetEmailSent(true)
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 items-center justify-center p-12">
        <div className="max-w-md">
          <div className="w-14 h-14 rounded-xl bg-teal-500 flex items-center justify-center text-xl font-bold text-white mb-6">TL</div>
          <h1 className="text-3xl font-bold text-white mb-3">Invoice tracking, built for Indian MSMEs</h1>
          <p className="text-slate-300 leading-relaxed">
            Automatically track payments, calculate interest under the MSMED Act 2006, and get neutral reminders — no legal knowledge needed.
          </p>
          <div className="mt-8 space-y-4">
            {[
              'Automatic 45-day due date calculation',
              'Real-time interest under Section 16',
              'Neutral, system-generated reminders',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-lg font-bold text-white mx-auto mb-3">TL</div>
            <h1 className="text-xl font-bold text-slate-900">TrustLedger</h1>
            <p className="text-sm text-slate-500 mt-1">Invoice Ledger for MSMEs</p>
          </div>

          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-4 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              Back to home
            </button>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">{isRegister ? 'Create your account' : 'Welcome back'}</h2>
            <p className="text-sm text-slate-500 mb-6">{isRegister ? 'Start tracking your invoices in minutes' : 'Sign in to your account'}</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 uppercase font-medium">or</span>
              <span className="flex-1 h-px bg-slate-200" />
            </div>

            {resetEmailSent && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
                <p className="text-sm text-emerald-700">If an account with this email exists, a password reset link has been sent.</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <PasswordInput
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              {!isRegister && (
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs text-slate-500">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {captchaRequired && (
                <div className="mt-4 flex justify-center" ref={captchaRef} />
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium py-2.5 rounded-lg text-sm mt-4 transition-colors"
              >
                {submitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <p className="text-xs text-center mt-4 text-slate-500">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="text-teal-600 hover:text-teal-700 font-medium underline"
                onClick={() => {
                  if (!isRegister && onSwitchToRegister) {
                    onSwitchToRegister()
                  } else {
                    switchMode(!isRegister)
                  }
                }}
              >
                {isRegister ? 'Sign in' : 'Register'}
              </button>
            </p>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-4">
            Secure &bull; Powered by the MSMED Act 2006
          </p>
        </div>
      </div>
    </div>
  )
}
