require('dotenv/config')
const Sentry = require('@sentry/node')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
const mongoSanitize = require('express-mongo-sanitize')
const auth = require('../backend/middleware/auth.js')
const invoiceRoutes = require('../backend/routes/invoices.js')
const userRoutes = require('../backend/routes/users.js')
const buyerRoutes = require('../backend/routes/buyers.js')
const notificationRoutes = require('../backend/routes/notifications.js')
const systemRoutes = require('../backend/routes/system.js')
const { loginLimiter, forgotFlowLimiter, apiLimiter } = require('../backend/services/rateLimit.js')
const { fingerprint, buildDeviceInfo } = require('../backend/services/deviceFingerprint.js')

const REQUIRED_ENV = ['MONGO_URL']
const missing = REQUIRED_ENV.filter(k => !process.env[k])
if (missing.length) console.error('[ENV] MISSING:', missing.join(', '))

Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'production' })

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN || 'https://trustledger.vercel.app' }))
app.set('trust proxy', 1)
app.use(express.json({ limit: '1mb' }))
app.use(mongoSanitize())

app.use((req, res, next) => {
  req.fingerprint = fingerprint(req)
  req.deviceInfo = buildDeviceInfo(req)
  next()
})

app.get('/health', (req, res) => res.json({ ok: true }))

app.use(Sentry.expressErrorHandler())

app.use('/users/check-lockout', loginLimiter)
app.use('/users/record-failed-attempt', loginLimiter)
app.use('/users/reset-attempts', loginLimiter)
app.use('/users/pin/verify', loginLimiter)
app.use('/users/pin/reset', forgotFlowLimiter)
app.use('/users/send-otp', forgotFlowLimiter)
app.use('/users/verify-otp', loginLimiter)

app.use('/users', userRoutes)
app.use('/invoices', auth, apiLimiter, invoiceRoutes)
app.use('/buyers', auth, apiLimiter, buyerRoutes)
app.use('/notifications', auth, apiLimiter, notificationRoutes)
app.use('/system', apiLimiter, systemRoutes)

app.use((err, req, res, next) => {
  console.error('[FATAL]', err.stack || err.message)
  res.status(500).json({ error: 'Internal server error' })
})

const mongoLog = process.env.MONGO_LOG_LEVEL === 'basic' ? err => console.error('MongoDB:', err.message) : console.error
mongoose.connection.on('error', mongoLog) // ponytail: global handler, per-env log level if more granularity needed
let cachedDb = null
async function connectDb() {
  if (cachedDb && mongoose.connection.readyState === 1) return
  cachedDb = await mongoose.connect(process.env.MONGO_URL)
}

module.exports = async function handler(req, res) {
  try {
    await connectDb()
    return app(req, res)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}