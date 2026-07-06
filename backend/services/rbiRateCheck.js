import cron from 'node-cron'
import SystemConfig from '../models/SystemConfig.js'
import { sendAlertEmail, buildRateChangeAlertEmail } from './mail.js'
import { createNotification } from './notify.js'
import User from '../models/User.js'

const RBI_RATE_URL = 'https://api.rbi.org.in/bank-rate'

export function startRbiRateCheck() {
  cron.schedule('0 10 * * 1', async () => {
    console.log('[RBI-RATE] Starting weekly bank rate check at', new Date().toISOString())
    await checkRbiRate()
  })
  console.log('[RBI-RATE] Scheduled: weekly on Monday at 10:00')
}

export async function checkRbiRate() {
  try {
    const fetchedRate = await fetchRbiRate()
    if (fetchedRate === null) {
      console.log('[RBI-RATE] Could not fetch current rate from RBI source')
      return
    }

    const config = await SystemConfig.getConfig()
    const storedRate = config.rbiBankRate

    config.rbiRateLastChecked = new Date()
    await config.save()

    const diff = Math.abs(fetchedRate - storedRate)
    if (diff > 0.1) {
      console.log(`[RBI-RATE] Rate change detected! Stored: ${storedRate}%, Fetched: ${fetchedRate}%`)

      config.rbiRateChangeFlagged = true
      config.rbiRatePreviousValue = storedRate
      await config.save()

      const users = await User.find({ emailReminders: true }).lean()
      let sent = 0
      // ponytail: single message per user, no dedup — cron runs weekly so it's fine
      for (const user of users) {
        if (user.email) {
          const { subject, text } = buildRateChangeAlertEmail(
            user.name, user.email, storedRate, fetchedRate
          )
          await sendAlertEmail({ to: user.email, subject, text })
          sent++
        }
        createNotification(user.firebaseUid, 'RBI Rate Change',
          `Bank rate may have changed from ${storedRate}% to ${fetchedRate}%. Review in Settings.`, 'warning')
      }
      console.log(`[RBI-RATE] Flagged change and notified ${sent} user(s)`)
    } else {
      console.log(`[RBI-RATE] Rate stable: stored=${storedRate}%, fetched=${fetchedRate}%, diff=${diff.toFixed(2)}`)
    }
  } catch (err) {
    console.error('[RBI-RATE] Error during rate check:', err.message)
  }
}

async function fetchRbiRate() {
  try {
    const res = await fetch(RBI_RATE_URL, {
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) {
      console.log(`[RBI-RATE] RBI endpoint returned ${res.status}`)
      return null
    }
    const text = await res.text()
    const rate = parseFloat(text.trim())
    if (isNaN(rate) || rate <= 0) {
      console.log(`[RBI-RATE] Could not parse rate from response: "${text.trim()}"`)
      return null
    }
    return rate
  } catch (err) {
    console.log('[RBI-RATE] Fetch failed:', err.message)
    return null
  }
}
