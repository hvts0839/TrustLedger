const nodemailer = require('nodemailer')
const { Resend } = require('resend')

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } else {
    transporter = { sendMail: async () => { throw new Error('No SMTP configured') } }
  }

  return transporter
}

async function sendAlertEmail({ to, subject, text }) {
  const from = process.env.EMAIL_FROM || 'noreply@trustledger.app'
  try {
    const t = getTransporter()
    await t.sendMail({ from: `"TrustLedger Security" <${from}>`, to, subject, text })
    console.log(`[MAIL] Alert sent to ${to}: "${subject}"`)
  } catch (err) {
    console.error('[MAIL] Failed to send alert:', err.message)
  }
}

function buildLockoutEmail(name, email) {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  return {
    subject: 'TrustLedger — Account Locked Due to Failed Login Attempts',
    text: `Hi ${name || 'Valued User'},

We detected 5 consecutive failed login attempts on your TrustLedger account (${email}) at ${now} IST.

As a security measure, we have temporarily locked your account for 30 minutes. During this time, you will not be able to sign in.

What to do:
- If this was you: wait 30 minutes and try again, or use the "Forgot Password" option on the login page to reset your password immediately and regain access.
- If this wasn't you: reset your password immediately using the "Forgot Password" link on the login page. Your account may be targeted by an attacker.

For assistance, please contact support.

— TrustLedger Security Team`,
  }
}

function buildNewDeviceEmail(name, email, deviceInfo) {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  return {
    subject: 'TrustLedger — New Sign-In From Unrecognised Device',
    text: `Hi ${name || 'Valued User'},

A successful sign-in was detected on your TrustLedger account (${email}) at ${now} IST from a device or location we haven't seen before.

Details:
${deviceInfo}

If this was you, no action is needed. You can safely ignore this email.

If this wasn't you, reset your password immediately using the "Forgot Password" link on the login page, and contact support.

— TrustLedger Security Team`,
  }
}

function buildOverdueEmail(userName, buyerName, invoiceNumber, amount, dueDate, interestAccrued) {
  const dueFormatted = dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  return {
    subject: `TrustLedger — Invoice ${invoiceNumber} is overdue`,
    text: `Hi ${userName || 'Valued User'},

This is a reminder that invoice ${invoiceNumber} from ${buyerName} for ₹${(amount || 0).toLocaleString('en-IN')} was due on ${dueFormatted}.

Interest under Section 16 of the MSMED Act, 2006 is accruing on this invoice. Current accrued interest: ₹${(interestAccrued || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}.

What you can do:
- Contact the buyer to remind them of the payment.
- View this invoice in your TrustLedger dashboard for the full breakdown.
- If payment has been made, mark it as paid in the app.

This reminder was sent at ${now} IST.

— TrustLedger Team`
  }
}

function buildPinChangedEmail(name) {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  return {
    subject: 'TrustLedger — Security PIN Changed',
    text: `Hi ${name || 'Valued User'},

Your TrustLedger security PIN was changed at ${now} IST.

If you made this change, no action is needed. If you did NOT, someone may have accessed your account. Reset your password and contact support immediately.

— TrustLedger Security Team`
  }
}

function buildPinResetEmail(name) {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  return {
    subject: 'TrustLedger — Security PIN Reset',
    text: `Hi ${name || 'Valued User'},

Your TrustLedger security PIN was reset at ${now} IST.

If you made this change, no action is needed. If you did NOT, someone may have accessed your account. Reset your password and contact support immediately.

— TrustLedger Security Team`
  }
}

function buildRateChangeAlertEmail(name, email, oldRate, newRate) {
  return {
    subject: 'TrustLedger — RBI Bank Rate May Have Changed',
    text: `Hi ${name || 'Valued User'},

Our automated check indicates that the RBI Bank Rate may have changed since it was last updated in TrustLedger.

Previous stored rate: ${oldRate}%
New rate detected: ${newRate}%

This change has NOT been automatically applied to your interest calculations. Please review the new rate and manually update it in Settings if you confirm the change is correct.

Why this matters: The MSMED Act, 2006 specifies that interest on overdue invoices is calculated at three times the RBI Bank Rate with monthly compounding. An outdated rate could affect interest calculations on your outstanding invoices.

— TrustLedger Team`
  }
}

let resendClient = null
function getResend() {
  if (resendClient) return resendClient
  if (process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

async function sendOtpEmail(email, code) {
  const from = process.env.EMAIL_FROM || 'TrustLedger <onboarding@resend.dev>'
  const subject = `${code} — Your TrustLedger verification code`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0f172a,#134e4a);padding:32px 28px;text-align:center;">
      <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#14b8a6,#0d9488);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="color:#fff;font-weight:800;font-size:14px;">TL</span>
      </div>
      <h1 style="color:#fff;font-size:20px;margin:0 0 4px;font-weight:700;">Verify your email</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0;">Enter this code to complete your registration</p>
    </div>
    <div style="padding:32px 28px;text-align:center;">
      <p style="font-size:14px;color:#475569;margin:0 0 20px;">Your verification code is:</p>
      <div style="background:#f0fdfa;border:2px dashed #14b8a6;border-radius:12px;padding:20px;margin:0 auto 20px;display:inline-block;">
        <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0f172a;font-family:'Courier New',monospace;">${code}</span>
      </div>
      <p style="font-size:13px;color:#94a3b8;margin:0 0 8px;">This code expires in <strong style="color:#475569;">10 minutes</strong></p>
      <p style="font-size:12px;color:#cbd5e1;margin:0;">If you didn't create a TrustLedger account, you can safely ignore this email.</p>
    </div>
    <div style="border-top:1px solid #f1f5f9;padding:16px 28px;text-align:center;">
      <p style="font-size:11px;color:#94a3b8;margin:0;">🔒 TrustLedger — Invoice Ledger for Indian MSMEs</p>
    </div>
  </div>
</body>
</html>`

  const resend = getResend()
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: email,
        subject,
        html,
      })
      if (error) {
        console.error('[OTP-MAIL] Resend error:', error)
        throw new Error(error.message)
      }
      console.log(`[OTP-MAIL] Sent OTP to ${email} via Resend (id: ${data?.id})`)
      return true
    } catch (err) {
      console.error('[OTP-MAIL] Resend failed, trying nodemailer fallback:', err.message)
    }
  }

  try {
    const t = getTransporter()
    await t.sendMail({ from, to: email, subject, html })
    console.log(`[OTP-MAIL] Sent OTP to ${email} via Nodemailer`)
    return true
  } catch (err) {
    console.error('[OTP-MAIL] All email methods failed:', err.message)
    return false
  }
}

module.exports = { sendAlertEmail, sendOtpEmail, buildLockoutEmail, buildNewDeviceEmail, buildOverdueEmail, buildPinChangedEmail, buildPinResetEmail, buildRateChangeAlertEmail }
