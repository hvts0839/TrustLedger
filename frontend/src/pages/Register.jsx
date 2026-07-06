import { useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'

// ─── password strength ────────────────────────────────────────────────────────
function getStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981']

// ─── flow steps shown in left panel ──────────────────────────────────────────
const FLOW_STEPS = [
  { icon: '✉️', label: 'Enter email & password' },
  { icon: '👤', label: 'Create account' },
  { icon: '💾', label: 'Saved — unverified' },
  { icon: '🔑', label: 'Verification token generated' },
  { icon: '📨', label: 'Email sent to you' },
  { icon: '🔗', label: 'You click the link' },
  { icon: '✅', label: 'Verified — login unlocked' },
]

function friendlyError(raw) {
  const code = raw.match(/\(auth\/([\w-]+)\)/)?.[1]
  if (code === 'email-already-in-use') return 'An account with this email already exists.'
  if (code === 'invalid-email') return 'Please enter a valid email address.'
  if (code === 'weak-password') return 'Password must be at least 6 characters.'
  if (code === 'too-many-requests') return 'Too many attempts. Please try again later.'
  return 'Something went wrong. Please try again.'
}

export default function Register({ onBack, onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  // Animate the left-panel steps on mount
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      i++
      if (i >= FLOW_STEPS.length) { clearInterval(id); return }
      setActiveStep(i)
    }, 350)
    return () => clearInterval(id)
  }, [])

  const strength = getStrength(password)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      // Create user record in MongoDB
      await api.post('/me', { email, authProvider: 'email' })
      // Send OTP via backend
      await api.post('/send-otp', { email })
      // App.jsx onAuthStateChanged will fire → checks emailVerified from DB → VerifyEmail shown
    } catch (err) {
      setError(friendlyError(err.message))
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
      // Google accounts are pre-verified — App.jsx will route normally
    } catch (err) {
      setError(friendlyError(err.message))
      setGoogleLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      {/* ── LEFT PANEL ── */}
      <div style={styles.left} className="register-left">
        <div style={styles.leftInner}>
          {/* Logo */}
          <div style={styles.logo}>
            <span style={styles.logoText}>TL</span>
          </div>
          <p style={styles.leftTitle}>How it works</p>
          <p style={styles.leftSub}>Your account is secured with email verification</p>

          {/* Step flow */}
          <div style={styles.stepList}>
            {FLOW_STEPS.map((step, i) => {
              const isActive = i <= activeStep
              const isLast = i === FLOW_STEPS.length - 1
              return (
                <div key={i} style={styles.stepRow}>
                  {/* connector line above (except first) */}
                  {i > 0 && (
                    <div style={{
                      ...styles.connector,
                      background: isActive ? '#14b8a6' : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.4s ease',
                    }} />
                  )}
                  <div style={styles.stepContent}>
                    <div style={{
                      ...styles.stepDot,
                      background: isActive
                        ? isLast ? 'linear-gradient(135deg,#10b981,#14b8a6)' : 'linear-gradient(135deg,#14b8a6,#0d9488)'
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: isActive ? '0 0 12px rgba(20,184,166,0.4)' : 'none',
                      transform: isActive ? 'scale(1)' : 'scale(0.85)',
                      transition: 'all 0.35s ease',
                    }}>
                      <span style={{ fontSize: 14 }}>{step.icon}</span>
                    </div>
                    <span style={{
                      ...styles.stepLabel,
                      color: isActive ? '#f8fafc' : 'rgba(255,255,255,0.3)',
                      transition: 'color 0.35s ease',
                    }}>
                      {step.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={styles.leftBadge}>
            <span style={styles.badgeDot} />
            Powered by Firebase Auth &amp; TrustLedger
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={styles.right}>
        <div style={styles.formWrap}>

          {/* Back button */}
          {onBack && (
            <button onClick={onBack} style={styles.backBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to home
            </button>
          )}

          {/* Mobile logo */}
          <div style={styles.mobileLogo}>
            <div style={styles.logo}><span style={styles.logoText}>TL</span></div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>TrustLedger</h1>
          </div>

          <div style={styles.card}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={styles.cardTitle}>Create your account</h2>
              <p style={styles.cardSub}>Start tracking your invoices — free, forever</p>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>{error}</p>
              </div>
            )}

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading || submitting}
              style={styles.googleBtn}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <GoogleIcon />
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>or</span>
              <span style={styles.dividerLine} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Email */}
              <div>
                <label style={styles.label}>Email address</label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={styles.input}
                  onFocus={e => e.target.style.borderColor = '#14b8a6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              {/* Password */}
              <div>
                <label style={styles.label}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="register-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    style={{ ...styles.input, paddingRight: 40 }}
                    onFocus={e => e.target.style.borderColor = '#14b8a6'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={styles.eyeBtn}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPw} />
                  </button>
                </div>
                {/* Strength bar */}
                {password.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map(s => (
                        <div key={s} style={{
                          flex: 1, height: 3, borderRadius: 99,
                          background: s <= strength ? STRENGTH_COLORS[strength] : '#e2e8f0',
                          transition: 'background 0.3s ease',
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: STRENGTH_COLORS[strength], margin: 0 }}>
                      {STRENGTH_LABELS[strength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={styles.label}>Confirm password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="register-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    style={{
                      ...styles.input,
                      paddingRight: 40,
                      borderColor: confirm && confirm !== password ? '#f87171' : '#cbd5e1',
                    }}
                    onFocus={e => e.target.style.borderColor = confirm !== password ? '#f87171' : '#14b8a6'}
                    onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? '#f87171' : '#cbd5e1'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    style={styles.eyeBtn}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>Passwords do not match</p>
                )}
                {confirm && confirm === password && (
                  <p style={{ fontSize: 11, color: '#10b981', margin: '4px 0 0' }}>✓ Passwords match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || googleLoading}
                style={{
                  ...styles.submitBtn,
                  opacity: submitting || googleLoading ? 0.6 : 1,
                  cursor: submitting || googleLoading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!submitting && !googleLoading) e.currentTarget.style.background = '#0f766e' }}
                onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <span style={styles.spinner} />
                    Creating account…
                  </span>
                ) : (
                  'Create Account →'
                )}
              </button>
            </form>

            <p style={styles.switchText}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                style={styles.switchLink}
                onMouseEnter={e => e.currentTarget.style.color = '#0f766e'}
                onMouseLeave={e => e.currentTarget.style.color = '#0d9488'}
              >
                Sign in
              </button>
            </p>
          </div>

          <p style={styles.footer}>
            🔒 Secure · Powered by the MSMED Act, 2006
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    background: '#f8fafc',
  },
  left: {
    display: 'none',
    flex: '0 0 420px',
    background: 'linear-gradient(160deg, #0f172a 0%, #134e4a 60%, #0f172a 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  leftInner: {
    position: 'relative',
    zIndex: 1,
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    boxShadow: '0 8px 24px rgba(20,184,166,0.3)',
  },
  logoText: {
    color: '#fff',
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: '-0.5px',
  },
  leftTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#f8fafc',
    margin: '0 0 6px',
    letterSpacing: '-0.3px',
  },
  leftSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    margin: '0 0 36px',
    lineHeight: 1.5,
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  stepRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  connector: {
    width: 2,
    height: 20,
    borderRadius: 99,
    marginLeft: 19,
  },
  stepContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  leftBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 32,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#10b981',
    display: 'inline-block',
    boxShadow: '0 0 6px #10b981',
  },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
  },
  formWrap: {
    width: '100%',
    maxWidth: 400,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: 12,
    padding: '0 0 16px',
    transition: 'color 0.15s',
  },
  mobileLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    padding: 28,
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px',
    letterSpacing: '-0.3px',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748b',
    margin: 0,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 16,
  },
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '11px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#334155',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '16px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e2e8f0',
    display: 'block',
  },
  dividerText: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    border: '1.5px solid #cbd5e1',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#0f172a',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
    background: '#fff',
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    background: '#0d9488',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    letterSpacing: '0.01em',
  },
  spinner: {
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  switchText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    margin: '16px 0 0',
  },
  switchLink: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#0d9488',
    fontWeight: 600,
    fontSize: 12,
    textDecoration: 'underline',
    padding: 0,
    transition: 'color 0.15s',
  },
  footer: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
  },
}

// Inject responsive styles + font once
if (typeof document !== 'undefined' && !document.getElementById('register-css')) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
  document.head.appendChild(link)

  const s = document.createElement('style')
  s.id = 'register-css'
  s.textContent = [
    '@keyframes spin { to { transform: rotate(360deg); } }',
    '@media (min-width: 900px) { .register-left { display: flex !important; } }',
  ].join('\n')
  document.head.appendChild(s)
}
