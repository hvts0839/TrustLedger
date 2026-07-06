import { useState, useEffect, useRef, useCallback } from 'react'
import { auth } from '../firebase'
import { api } from '../api'

export default function VerifyEmail({ onVerified }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resent, setResent] = useState(false)
  const [expiryTime, setExpiryTime] = useState(600) // 10 minutes in seconds
  const inputRefs = useRef([])
  const email = auth.currentUser?.email || ''

  // Expiry countdown
  useEffect(() => {
    if (expiryTime <= 0) return
    const id = setInterval(() => {
      setExpiryTime(t => {
        if (t <= 1) { clearInterval(id); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [expiryTime])

  // Resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(id); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = useCallback((index, value) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits(prev => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    setError('')

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [])

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [digits])

  // Handle paste
  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newDigits = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]
    }
    setDigits(newDigits)
    setError('')
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }, [])

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    const code = digits.join('')
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      handleVerify(code)
    }
  }, [digits]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(code) {
    if (verifying) return
    const otp = code || digits.join('')
    if (otp.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setVerifying(true)
    setError('')
    try {
      const result = await api.post('/users/verify-otp', { code: otp })
      if (result.ok) {
        setSuccess('Email verified successfully!')
        setTimeout(() => onVerified(), 800)
      }
    } catch (err) {
      let msg = 'Verification failed. Please try again.'
      try {
        const parsed = JSON.parse(err.message)
        msg = parsed.error || msg
      } catch {}
      setError(msg)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    setError('')
    setResent(false)
    try {
      await api.post('/users/send-otp', { email })
      setCooldown(60)
      setResent(true)
      setExpiryTime(600)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch {
      setError('Could not resend code. Please try again.')
    }
  }

  async function handleSignOut() {
    await auth.signOut()
  }

  const expiryMin = Math.floor(expiryTime / 60)
  const expirySec = expiryTime % 60
  const isExpired = expiryTime <= 0

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shake { 0%,100% { transform:translateX(0); } 20%,60% { transform:translateX(-6px); } 40%,80% { transform:translateX(6px); } }
        @keyframes glow { 0%,100% { box-shadow:0 0 0 3px rgba(20,184,166,0.15); } 50% { box-shadow:0 0 0 6px rgba(20,184,166,0.08); } }
        .otp-card { animation: fadeUp 0.4s ease both; }
        .otp-shake { animation: shake 0.4s ease; }
        .otp-input:focus { border-color:#14b8a6 !important; box-shadow:0 0 0 3px rgba(20,184,166,0.15); animation: glow 2s ease-in-out infinite; }
        .otp-input::selection { background: transparent; }
      `}</style>

      <div style={s.wrap} className="otp-card">
        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logo}>TL</div>
          <span style={s.logoName}>TrustLedger</span>
        </div>

        {/* Steps */}
        <div style={s.stepsRow}>
          {[
            { label: 'Account', done: true },
            { label: 'OTP Sent', done: true },
            { label: 'Verify', done: false, current: true },
            { label: 'Done', done: false },
          ].map((step, i) => (
            <div key={i} style={s.stepItem}>
              {i > 0 && <div style={{ ...s.stepLine, background: step.done ? '#14b8a6' : '#e2e8f0' }} />}
              <div style={{
                ...s.stepCircle,
                background: step.done ? 'linear-gradient(135deg,#14b8a6,#0d9488)'
                  : step.current ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#e2e8f0',
                boxShadow: step.current ? '0 0 0 4px rgba(245,158,11,0.15)' : 'none',
              }}>
                {step.done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                ) : step.current ? (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }} />
                )}
              </div>
              <span style={{ ...s.stepLabel, color: step.done ? '#0d9488' : step.current ? '#d97706' : '#94a3b8', fontWeight: step.current ? 600 : 400 }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={s.card}>
          {/* Icon */}
          <div style={s.iconWrap}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="6" width="20" height="14" rx="2" stroke="#14b8a6" strokeWidth="1.5" fill="#f0fdfa"/>
              <path d="M2,8 L12,14 L22,8" stroke="#14b8a6" strokeWidth="1.5" fill="none"/>
              <circle cx="18" cy="8" r="5" fill="#10b981"/>
              <text x="18" y="10.5" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="800" fontFamily="monospace">#</text>
            </svg>
          </div>

          <h1 style={s.title}>Enter verification code</h1>
          <p style={s.subtitle}>
            We sent a 6-digit code to <strong style={{ color: '#0f172a' }}>{email}</strong>
          </p>

          {/* Timer */}
          {!isExpired && (
            <div style={s.timerRow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Code expires in <strong style={{ color: expiryTime < 60 ? '#ef4444' : '#0f172a' }}>
                  {expiryMin}:{String(expirySec).padStart(2, '0')}
                </strong>
              </span>
            </div>
          )}

          {isExpired && (
            <div style={s.expiredBox}>
              <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>Code has expired. Please request a new one.</p>
            </div>
          )}

          {/* OTP Input */}
          <div style={s.otpRow} className={error ? 'otp-shake' : ''}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={isExpired || verifying}
                style={{
                  ...s.otpInput,
                  borderColor: error ? '#f87171' : d ? '#14b8a6' : '#e2e8f0',
                  background: d ? '#f0fdfa' : '#fff',
                  opacity: isExpired ? 0.5 : 1,
                }}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={s.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={s.successBox}>
              <p style={{ margin: 0, fontSize: 13, color: '#065f46' }}>✓ {success}</p>
            </div>
          )}

          {resent && !error && !success && (
            <div style={s.successBox}>
              <p style={{ margin: 0, fontSize: 13, color: '#065f46' }}>✓ New code sent to {email}</p>
            </div>
          )}

          {/* Actions */}
          <div style={s.actions}>
            <button
              onClick={() => handleVerify()}
              disabled={verifying || digits.join('').length !== 6 || isExpired}
              style={{
                ...s.primaryBtn,
                opacity: verifying || digits.join('').length !== 6 || isExpired ? 0.5 : 1,
                cursor: verifying || digits.join('').length !== 6 || isExpired ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!verifying) e.currentTarget.style.background = '#0f766e' }}
              onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}
            >
              {verifying ? 'Verifying…' : 'Verify Code →'}
            </button>

            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              style={{
                ...s.secondaryBtn,
                opacity: cooldown > 0 ? 0.5 : 1,
                cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!cooldown) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>

          <div style={s.spamNote}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Check spam or promotions if you don't see the email
          </div>
        </div>

        <button
          onClick={handleSignOut}
          style={s.signOutBtn}
          onMouseEnter={e => e.currentTarget.style.color = '#475569'}
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
        >
          ← Use a different account
        </button>
      </div>
    </div>
  )
}

const s = {
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg,#f0fdfa 0%,#f8fafc 50%,#fff 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
  },
  wrap: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg,#14b8a6,#0d9488)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
    fontSize: 13,
    boxShadow: '0 4px 12px rgba(20,184,166,0.3)',
  },
  logoName: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.2px',
  },
  stepsRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
    justifyContent: 'center',
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
    flex: 1,
  },
  stepLine: {
    position: 'absolute',
    left: '-50%',
    top: 14,
    width: '100%',
    height: 2,
    borderRadius: 99,
    zIndex: 0,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 1.3,
    maxWidth: 60,
  },
  card: {
    width: '100%',
    background: '#fff',
    borderRadius: 20,
    border: '1px solid #e2e8f0',
    padding: '32px 28px 24px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px',
    textAlign: 'center',
    letterSpacing: '-0.4px',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    margin: '0 0 16px',
    lineHeight: 1.5,
  },
  timerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  expiredBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '8px 14px',
    marginBottom: 16,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  otpRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    border: '2px solid #e2e8f0',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 700,
    fontFamily: "'Inter', monospace",
    color: '#0f172a',
    outline: 'none',
    transition: 'all 0.15s ease',
    caretColor: '#14b8a6',
    boxSizing: 'border-box',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  successBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 12,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  primaryBtn: {
    width: '100%',
    background: '#0d9488',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 600,
    transition: 'background 0.15s',
  },
  secondaryBtn: {
    width: '100%',
    background: '#fff',
    color: '#475569',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    padding: '11px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  spamNote: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 14,
  },
  signOutBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 20,
    transition: 'color 0.15s',
    padding: 0,
  },
}
