const { Router } = require('express')
const crypto = require('crypto')
const User = require('../models/User.js')
const OTP = require('../models/OTP.js')
const auth = require('../middleware/auth.js')
const { sendAlertEmail, buildLockoutEmail, buildNewDeviceEmail, buildPinChangedEmail, buildPinResetEmail, sendOtpEmail } = require('../services/mail.js')
const { createNotification } = require('../services/notify.js')

const router = Router()

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 30 * 60 * 1000
const CAPTCHA_ATTEMPT_THRESHOLD = 3

const ipAttemptCounts = new Map()

function sanitizeString(val, maxLen = 256) {
  if (typeof val !== 'string') return ''
  return val.trim().slice(0, maxLen)
}

function getIpAttempts(ip) {
  const now = Date.now()
  const entry = ipAttemptCounts.get(ip)
  if (!entry || now - entry.resetAt > 15 * 60 * 1000) {
    const fresh = { count: 0, resetAt: now }
    ipAttemptCounts.set(ip, fresh)
    return fresh
  }
  return entry
}

function incrementIpAttempts(ip) {
  const entry = getIpAttempts(ip)
  entry.count++
  return entry.count
}

function resetIpAttempts(ip) {
  ipAttemptCounts.delete(ip)
}

function ipNeedsCaptcha(ip) {
  return getIpAttempts(ip).count >= CAPTCHA_ATTEMPT_THRESHOLD
}

async function verifyCaptcha(token) {
  if (!process.env.RECAPTCHA_SECRET) return true
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${encodeURIComponent(token)}`,
    })
    const data = await res.json()
    if (!data.success) {
      console.log('[CAPTCHA] Verification failed:', data['error-codes'])
    }
    return data.success
  } catch (err) {
    console.error('[CAPTCHA] Error:', err.message)
    return false
  }
}

router.post('/check-lockout', async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 256)
    if (!email) return res.json({ locked: false, captchaRequired: ipNeedsCaptcha(req.ip) })

    const user = await User.findOne({ email })
    const needsCaptcha = ipNeedsCaptcha(req.ip)

    if (!user || !user.passwordLockedUntil) return res.json({ locked: false, captchaRequired: needsCaptcha })

    if (user.passwordLockedUntil > new Date()) {
      const remaining = Math.ceil((user.passwordLockedUntil - new Date()) / 60000)
      console.log(`[SECURITY] Locked login attempt for ${email} — ${remaining}m remaining`)
      return res.json({ locked: true, remainingMinutes: remaining, captchaRequired: needsCaptcha })
    }

    user.passwordAttempts = 0
    user.passwordLockedUntil = null
    await user.save()
    res.json({ locked: false, captchaRequired: needsCaptcha })
  } catch (err) {
    console.error('[SECURITY] check-lockout error:', err.message)
    res.json({ locked: false, captchaRequired: false })
  }
})

router.post('/record-failed-attempt', async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 256)
    if (!email) return res.json({ ok: true })

    incrementIpAttempts(req.ip)

    const user = await User.findOne({ email })
    if (!user) return res.json({ ok: true })

    user.passwordAttempts = (user.passwordAttempts || 0) + 1
    console.log(`[SECURITY] Failed password attempt for ${email} (${user.passwordAttempts}/${LOCKOUT_THRESHOLD})`)

    if (user.passwordAttempts >= LOCKOUT_THRESHOLD) {
      user.passwordLockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
      user.passwordAttempts = 0
      console.log(`[SECURITY] Account locked for ${email} — ${LOCKOUT_DURATION_MS / 60000}m lockout`)

      createNotification(user.firebaseUid, 'Account Locked', 'Too many failed login attempts. Account locked for 30 minutes.', 'error')
      const { subject, text } = buildLockoutEmail(user.name, email)
      sendAlertEmail({ to: email, subject, text })
    }

    await user.save()
    res.json({ ok: true })
  } catch (err) {
    console.error('[SECURITY] record-failed-attempt error:', err.message)
    res.json({ ok: true })
  }
})

router.post('/reset-attempts', async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 256)
    if (!email) return res.json({ ok: true })

    resetIpAttempts(req.ip)

    const user = await User.findOne({ email })
    if (user) {
      const fp = req.fingerprint
      const isNewDevice = !user.knownDevices?.includes(fp)

      user.passwordAttempts = 0
      user.passwordLockedUntil = null
      user.lastLoginAt = new Date()

      if (isNewDevice && fp) {
        if (!user.knownDevices) user.knownDevices = []
        user.knownDevices.push(fp)
        console.log(`[SECURITY] New device login for ${email} — fingerprint: ${fp.slice(0, 16)}...`)

        createNotification(user.firebaseUid, 'New Device Login', `New sign-in from unrecognised device.`, 'warning')
        const { subject, text } = buildNewDeviceEmail(user.name, email, req.deviceInfo || 'Unknown device')
        sendAlertEmail({ to: email, subject, text })
      }

      await user.save()
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('[SECURITY] reset-attempts error:', err.message)
    res.json({ ok: true })
  }
})

router.post('/verify-captcha', async (req, res) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'CAPTCHA token required' })

    const valid = await verifyCaptcha(token)
    if (valid) {
      resetIpAttempts(req.ip)
      res.json({ ok: true })
    } else {
      console.log(`[CAPTCHA] Failed verification from IP ${req.ip}`)
      res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' })
    }
  } catch (err) {
    console.error('[CAPTCHA] Error:', err.message)
    res.status(500).json({ error: 'CAPTCHA verification failed' })
  }
})

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPin(pin, stored) {
  const [salt, hash] = stored.split(':')
  const check = crypto.scryptSync(pin, salt, 64).toString('hex')
  return check === hash
}

router.get('/me', auth, async (req, res) => {
  let user = await User.findOne({ firebaseUid: req.msmeId })
  if (!user) return res.status(404).json({ error: 'not found' })
  res.json(user)
})

router.post('/me', auth, async (req, res, next) => {
  try {
    const existing = await User.findOne({ firebaseUid: req.msmeId })
    if (existing) return res.json(existing)

    const user = await User.create({
      firebaseUid: req.msmeId,
      name: req.body.name || '',
      email: req.body.email || '',
      authProvider: req.body.authProvider || 'email',
    })
    await createNotification(req.msmeId, 'Welcome to TrustLedger', 'Your account is ready. Set up your profile to get started.', 'success')
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
})

router.patch('/me', auth, async (req, res) => {
  try {
    const allowed = ['name', 'companyName', 'udyamNumber', 'email', 'phone', 'profileComplete', 'emailReminders', 'dataSharing']
    const updates = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.msmeId },
      { $set: updates },
      { upsert: true, new: true }
    )
    if (Object.keys(updates).length) createNotification(req.msmeId, 'Profile Updated', 'Your profile has been updated.', 'info')
    res.json(user)
  } catch (err) {
    console.error('[PATCH /me]', err.message)
    res.status(400).json({ error: err.message })
  }
})

router.get('/pin/status', auth, async (req, res) => {
  const user = await User.findOne({ firebaseUid: req.msmeId })
  res.json({ hasPin: !!user?.pinHash })
})

router.post('/pin/set', auth, async (req, res) => {
  const { pin } = req.body
  if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' })

  const user = await User.findOne({ firebaseUid: req.msmeId })
  if (!user) {
    console.log(`[PIN] Set failed — user not found for UID ${req.msmeId}`)
    return res.status(404).json({ error: 'user not found' })
  }

  user.pinHash = hashPin(pin)
  user.pinAttempts = 0
  user.pinLockedUntil = null
  await user.save()
  createNotification(req.msmeId, 'PIN Set', 'Your security PIN has been set successfully.', 'success')
  console.log(`[PIN] Set successfully for UID ${req.msmeId}`)
  res.json({ ok: true })
})

router.post('/pin/verify', auth, async (req, res) => {
  const { pin } = req.body
  if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' })

  const user = await User.findOne({ firebaseUid: req.msmeId })
  if (!user || !user.pinHash) return res.status(400).json({ error: 'No PIN set' })

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const remaining = Math.ceil((user.pinLockedUntil - new Date()) / 1000)
    return res.status(429).json({ error: `Too many attempts. Try again in ${remaining} seconds.` })
  }

  if (verifyPin(pin, user.pinHash)) {
    user.pinAttempts = 0
    user.pinLockedUntil = null
    await user.save()
    return res.json({ ok: true })
  }

  user.pinAttempts = (user.pinAttempts || 0) + 1
  if (user.pinAttempts >= 5) {
    user.pinLockedUntil = new Date(Date.now() + 60000)
    user.pinAttempts = 0
    await user.save()
    createNotification(req.msmeId, 'PIN Locked', 'Too many incorrect PIN attempts. Locked for 60 seconds.', 'warning')
    return res.status(429).json({ error: 'Too many incorrect attempts. Locked for 60 seconds.' })
  }
  await user.save()
  res.status(401).json({ error: `Incorrect PIN. ${5 - user.pinAttempts} attempts remaining.` })
})

router.post('/pin/change', auth, async (req, res) => {
  const { currentPin, newPin } = req.body
  if (!newPin || !/^\d{4}$/.test(newPin)) return res.status(400).json({ error: 'New PIN must be exactly 4 digits' })

  const user = await User.findOne({ firebaseUid: req.msmeId })
  if (!user || !user.pinHash) return res.status(400).json({ error: 'No PIN set' })

  if (!currentPin || !verifyPin(currentPin, user.pinHash)) {
    return res.status(401).json({ error: 'Current PIN is incorrect' })
  }

  user.pinHash = hashPin(newPin)
  user.pinAttempts = 0
  user.pinLockedUntil = null
  await user.save()
  createNotification(req.msmeId, 'PIN Changed', 'Your security PIN has been changed.', 'success')
  if (user.email) {
    const { subject, text } = buildPinChangedEmail(user.name)
    sendAlertEmail({ to: user.email, subject, text })
  }
  res.json({ ok: true })
})

router.post('/pin/reset', auth, async (req, res) => {
  const { pin, captchaToken } = req.body
  if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' })

  if (ipNeedsCaptcha(req.ip)) {
    if (!captchaToken) return res.status(400).json({ error: 'CAPTCHA required. Please refresh and try again.' })
    const valid = await verifyCaptcha(captchaToken)
    if (!valid) {
      console.log(`[CAPTCHA] Failed on pin/reset from IP ${req.ip}`)
      return res.status(400).json({ error: 'CAPTCHA verification failed.' })
    }
    resetIpAttempts(req.ip)
  }

  const user = await User.findOne({ firebaseUid: req.msmeId })
  if (!user) return res.status(404).json({ error: 'user not found' })

  user.pinHash = hashPin(pin)
  user.pinAttempts = 0
  user.pinLockedUntil = null
  await user.save()
  createNotification(req.msmeId, 'PIN Reset', 'Your security PIN has been reset.', 'success')
  if (user.email) {
    const { subject, text } = buildPinResetEmail(user.name)
    sendAlertEmail({ to: user.email, subject, text })
  }
  res.json({ ok: true })
})

router.post('/log/verification-sent', auth, async (req, res) => {
  console.log(`[EMAIL-VERIFICATION] Sent to UID ${req.msmeId}`)
  res.json({ ok: true })
})

router.post('/log/verification-completed', auth, async (req, res) => {
  const user = await User.findOne({ firebaseUid: req.msmeId })
  console.log(`[EMAIL-VERIFICATION] Completed for ${user?.email || req.msmeId}`)
  res.json({ ok: true })
})

router.post('/fcm-token', auth, async (req, res) => {
  const { token } = req.body
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' })
  await User.updateOne(
    { firebaseUid: req.msmeId },
    { $addToSet: { fcmTokens: token } }
  )
  res.json({ ok: true })
})

// ─── OTP Routes ──────────────────────────────────────────────────────────────

const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const OTP_MAX_ATTEMPTS = 5

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString()
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

router.post('/send-otp', auth, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.msmeId })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true })

    const email = user.email || req.body.email
    if (!email) return res.status(400).json({ error: 'No email address found' })

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email })

    // Generate and store hashed OTP
    const code = generateOtp()
    await OTP.create({
      email,
      code: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    })

    // Send email
    const sent = await sendOtpEmail(email, code)
    if (!sent) {
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' })
    }

    console.log(`[OTP] Sent to ${email} for UID ${req.msmeId}`)
    res.json({ ok: true, email })
  } catch (err) {
    console.error('[OTP] send-otp error:', err.message)
    res.status(500).json({ error: 'Failed to send OTP' })
  }
})

router.post('/verify-otp', auth, async (req, res) => {
  try {
    const { code } = req.body
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit code' })
    }

    const user = await User.findOne({ firebaseUid: req.msmeId })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true })

    const email = user.email || req.body.email
    const otpRecord = await OTP.findOne({ email })

    if (!otpRecord) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' })
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id })
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' })
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id })
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' })
    }

    const hashed = hashOtp(code)
    if (hashed !== otpRecord.code) {
      otpRecord.attempts += 1
      await otpRecord.save()
      const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts
      return res.status(400).json({
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      })
    }

    // OTP is correct — mark user verified
    user.emailVerified = true
    if (email && !user.email) user.email = email
    await user.save()
    await OTP.deleteOne({ _id: otpRecord._id })

    createNotification(req.msmeId, 'Email Verified', 'Your email has been successfully verified.', 'success')
    console.log(`[OTP] Verified successfully for ${email} (UID: ${req.msmeId})`)
    res.json({ ok: true })
  } catch (err) {
    console.error('[OTP] verify-otp error:', err.message)
    res.status(500).json({ error: 'Verification failed' })
  }
})

module.exports = router
