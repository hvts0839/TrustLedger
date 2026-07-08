import cron from 'node-cron'
import SystemConfig from '../models/SystemConfig.js'
import { sendAlertEmail, buildRateChangeAlertEmail } from './mail.js'
import { createNotification } from './notify.js'
import User from '../models/User.js'

const RBI_NSDP_URL = 'https://rbi.org.in/Scripts/BS_NSDPDisplay.aspx?param=4'

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
      console.log('[RBI-RATE] Could not fetch current rate from RBI NSDP page')
      return
    }

    const config = await SystemConfig.getConfig()
    const storedRate = config.rbiBankRate

    const now = new Date()
    config.rbiRateLastChecked = now

    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // push snapshot to history (avoid dupes for same month)
    const exists = config.rateHistory.some(e => e.year === year && e.month === month)
    if (!exists) {
      config.rateHistory.push({ year, month, rate: fetchedRate })
    }

    await config.save()

    const diff = Math.abs(fetchedRate - storedRate)
    if (diff > 0.1) {
      console.log(`[RBI-RATE] Rate change detected! Stored: ${storedRate}%, Fetched: ${fetchedRate}%`)

      config.rbiRateChangeFlagged = true
      config.rbiRatePreviousValue = storedRate
      config.rbiBankRate = fetchedRate
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
          `Bank rate changed from ${storedRate}% to ${fetchedRate}%. Review in Settings.`, 'warning')
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
    const res = await fetch(RBI_NSDP_URL, {
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) {
      console.log(`[RBI-RATE] RBI page returned ${res.status}`)
      return null
    }
    const html = await res.text()
    // ponytail: regex scrape of NSDP HTML table — last number in Bank Rate row is the latest weekly value
    const rowMatch = html.match(/Bank Rate<\/td>([\s\S]*?)<\/tr>/i)
    if (!rowMatch) {
      console.log('[RBI-RATE] Could not find Bank Rate row in NSDP page')
      return null
    }
    const numbers = rowMatch[1].match(/>([\d.]+)</g)
    if (!numbers || numbers.length === 0) {
      console.log('[RBI-RATE] Could not find any numbers in Bank Rate row')
      return null
    }
    const lastNum = numbers[numbers.length - 1].match(/[\d.]+/)[0]
    const rate = parseFloat(lastNum)
    if (isNaN(rate) || rate <= 0) {
      console.log(`[RBI-RATE] Could not parse rate from: "${lastNum}"`)
      return null
    }
    return rate
  } catch (err) {
    console.log('[RBI-RATE] Fetch failed:', err.message)
    return null
  }
}
