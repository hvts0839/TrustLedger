const cron = require('node-cron')
const Invoice = require('../models/Invoice.js')
const User = require('../models/User.js')
const { sendAlertEmail, buildOverdueEmail } = require('./mail.js')
const { calculateInterestSync } = require('./interest.js')
const { createNotification } = require('./notify.js')
const { daysOverdue, stageForDays, transitionTo, STAGES } = require('./escalation.js')

function startOverdueScan() {
  cron.schedule('0 6 * * *', async () => {
    console.log('[OVERDUE-SCAN] Starting daily overdue scan at', new Date().toISOString())
    await runOverdueScan()
  })
  console.log('[OVERDUE-SCAN] Scheduled: daily at 06:00')
}

async function runOverdueScan() {
  const start = Date.now()
  const now = new Date()
  let scanned = 0
  let stageChanges = 0
  let emailsSent = 0
  let errors = 0

  try {
    const invoices = await Invoice.find({ status: 'outstanding' }).lean()

    for (const inv of invoices) {
      scanned++
      try {
        const overdue = daysOverdue(inv.deliveryDate, inv.agreedTermsDays, now)
        if (overdue <= 0) continue

        const targetStage = stageForDays(overdue)
        if (targetStage <= inv.escalationStage) continue  // already at or past this stage

        stageChanges++
        const updates = transitionTo(inv, targetStage, now)
        await Invoice.findByIdAndUpdate(inv._id, { $set: updates })

        // ponytail: same notification for all stages; could differentiate copy per stage
        await createNotification(
          inv.msmeId,
          `Invoice ${STAGES[targetStage]}`,
          `${inv.buyerName} — ${inv.invoiceNumber || 'No ref'} (₹${inv.amount.toLocaleString('en-IN')}) — ${STAGES[targetStage].toLowerCase()} stage.`,
          targetStage >= 2 ? 'error' : 'warning',
          inv._id
        )

        if (targetStage === 1) {
          const user = await User.findOne({ firebaseUid: inv.msmeId })
          if (user && user.emailReminders && user.email) {
            const { totalInterest } = calculateInterestSync(
              inv.amount, inv.deliveryDate, inv.agreedTermsDays, now
            )
            const due = new Date(inv.deliveryDate)
            due.setDate(due.getDate() + inv.agreedTermsDays)
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
    `[OVERDUE-SCAN] Complete — scanned: ${scanned}, stage changes: ${stageChanges}, ` +
    `emails sent: ${emailsSent}, errors: ${errors}, duration: ${elapsed}ms`
  )
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

module.exports = { startOverdueScan, runOverdueScan }
