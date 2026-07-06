import { Router } from 'express'
import SystemConfig from '../models/SystemConfig.js'
import auth from '../middleware/auth.js'

const router = Router()

router.get('/config', auth, async (req, res) => {
  const config = await SystemConfig.getConfig()
  res.json({
    rbiBankRate: config.rbiBankRate,
    lastUpdated: config.lastUpdated,
    rbiRateChangeFlagged: config.rbiRateChangeFlagged,
    rbiRatePreviousValue: config.rbiRatePreviousValue,
    rbiRateLastChecked: config.rbiRateLastChecked,
  })
})

router.patch('/config/bank-rate', auth, async (req, res) => {
  const { rbiBankRate } = req.body
  if (rbiBankRate === undefined || typeof rbiBankRate !== 'number') {
    return res.status(400).json({ error: 'rbiBankRate must be a number' })
  }
  if (rbiBankRate <= 0 || rbiBankRate > 50) {
    return res.status(400).json({ error: 'Bank rate must be between 0 and 50 percent' })
  }
  const config = await SystemConfig.updateBankRate(rbiBankRate)
  config.rbiRateChangeFlagged = false
  config.rbiRatePreviousValue = null
  await config.save()
  console.log(`[SYSTEM] RBI Bank Rate updated to ${rbiBankRate}% by user ${req.msmeId}`)
  res.json({ ok: true, rbiBankRate: config.rbiBankRate, lastUpdated: config.lastUpdated })
})

router.post('/config/acknowledge-rate-flag', auth, async (req, res) => {
  const config = await SystemConfig.getConfig()
  config.rbiRateChangeFlagged = false
  config.rbiRatePreviousValue = null
  await config.save()
  res.json({ ok: true })
})

export default router
