import cron from 'node-cron'
import Invoice from '../models/Invoice.js'
import User from '../models/User.js'
import { sendAlertEmail, buildOverdueEmail } from './mail.js'
import { calculateInterestSync } from './interest.js'
import { createNotification } from './notify.js'

export function startOverdueScan() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[OVERDUE-SCAN] Starting daily scan at', new Date().toISOString())
    await runOverdueScan()
  })
  console.log('[OVERDUE-SCAN] Scheduled: daily at 08:00')
}

export async function runOverdueScan() {
  const start = Date.now()
  const now = new Date()
  let scanned = 0
  let newlyFlagged = 0
  let emailsSent = 0
  let errors = 0

  try {
    const invoices = await Invoice.find({ status: 'outstanding' }).lean()

    for (const inv of invoices) {
      scanned++
      try {
        const due = new Date(inv.deliveryDate)
        due.setDate(due.getDate() + inv.agreedTermsDays)

        if (due >= now) continue

        const lastNotified = inv.lastOverdueNotifiedAt ? new Date(inv.lastOverdueNotifiedAt) : null
        const alreadyNotifiedToday = lastNotified && isSameDay(lastNotified, now)

        if (!alreadyNotifiedToday) {
          newlyFlagged++
            await Invoice.findByIdAndUpdate(inv._id, {
              $set: { lastOverdueNotifiedAt: now, escalationStage: inv.escalationStage ? inv.escalationStage + 1 : 1 }
            })
            await createNotification(
              inv.msmeId,
              'Invoice Overdue',
              `${inv.buyerName} — ${inv.invoiceNumber || 'No ref'} (₹${inv.amount.toLocaleString('en-IN')}) is overdue today.`,
              'warning',
              inv._id
            )

          const user = await User.findOne({ firebaseUid: inv.msmeId })
          if (user && user.emailReminders && user.email) {
            const { totalInterest } = calculateInterestSync(
              inv.amount, inv.deliveryDate, inv.agreedTermsDays, now
            )
            const { subject, text } = buildOverdueEmail(
              user.name || 'Valued User',
              inv.buyerName,
              inv.invoiceNumber,
              inv.amount,
              due,
              totalInterest
            )
            await sendAlertEmail({ to: user.email, subject, text })
            emailsSent++
          }
        }
      } catch (err) {
        errors++
        console.error(`[OVERDUE-SCAN] Error processing invoice ${inv._id}:`, err.message)
      }
    }
  } catch (err) {
    errors++
    console.error('[OVERDUE-SCAN] Fatal error:', err.message)
  }

  const elapsed = Date.now() - start
  console.log(
    `[OVERDUE-SCAN] Complete — scanned: ${scanned}, newly flagged: ${newlyFlagged}, ` +
    `emails sent: ${emailsSent}, errors: ${errors}, duration: ${elapsed}ms`
  )
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}
