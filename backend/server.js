import 'dotenv/config'
import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import mongoSanitize from 'express-mongo-sanitize'
import auth from './middleware/auth.js'
import invoiceRoutes from './routes/invoices.js'
import userRoutes from './routes/users.js'
import buyerRoutes from './routes/buyers.js'
import notificationRoutes from './routes/notifications.js'
import systemRoutes from './routes/system.js'
import { loginLimiter, forgotFlowLimiter, apiLimiter } from './services/rateLimit.js'
import { fingerprint, buildDeviceInfo } from './services/deviceFingerprint.js'
import { startOverdueScan } from './services/overdueScan.js'
import { startRbiRateCheck } from './services/rbiRateCheck.js'

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
mongoose.connect(process.env.MONGO_URL).then(() => {
  startOverdueScan()
  startRbiRateCheck()
  app.listen(process.env.PORT || 3000, () => console.log('up'))
}).catch(err => {
  console.error('MongoDB connection failed:', err.message)
  process.exit(1)
})
