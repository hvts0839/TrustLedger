require('dotenv/config')
const Sentry = require('@sentry/node')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
const mongoSanitize = require('express-mongo-sanitize')
const auth = require('./middleware/auth.js')
const invoiceRoutes = require('./routes/invoices.js')
const userRoutes = require('./routes/users.js')
const buyerRoutes = require('./routes/buyers.js')
const notificationRoutes = require('./routes/notifications.js')
const systemRoutes = require('./routes/system.js')
const { loginLimiter, forgotFlowLimiter, apiLimiter } = require('./services/rateLimit.js')
const { fingerprint, buildDeviceInfo } = require('./services/deviceFingerprint.js')
const { startOverdueScan } = require('./services/overdueScan.js')
const { startRbiRateCheck } = require('./services/rbiRateCheck.js')

Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'development' })

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
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

if (!process.env.MONGO_URL) {
  console.error('MONGO_URL not set — copy backend/.env.example to backend/.env and fill it in')
  process.exit(1)
}
const mongoLog = process.env.MONGO_LOG_LEVEL === 'basic' ? err => console.error('MongoDB:', err.message) : console.error
mongoose.connection.on('error', mongoLog) // ponytail: global handler, per-env log level if more granularity needed
mongoose.connect(process.env.MONGO_URL).then(() => {
  startOverdueScan()
  startRbiRateCheck()
  app.listen(process.env.PORT || 3000, () => console.log('up'))
}).catch(err => {
  console.error('MongoDB connection failed:', err.message)
  process.exit(1)
})
