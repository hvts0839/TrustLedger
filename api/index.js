import 'dotenv/config'
import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import mongoSanitize from 'express-mongo-sanitize'
import auth from '../backend/middleware/auth.js'
import invoiceRoutes from '../backend/routes/invoices.js'
import userRoutes from '../backend/routes/users.js'
import buyerRoutes from '../backend/routes/buyers.js'
import notificationRoutes from '../backend/routes/notifications.js'
import systemRoutes from '../backend/routes/system.js'
import { loginLimiter, forgotFlowLimiter, apiLimiter } from '../backend/services/rateLimit.js'
import { fingerprint, buildDeviceInfo } from '../backend/services/deviceFingerprint.js'

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

const mongoLog = process.env.MONGO_LOG_LEVEL === 'basic' ? err => console.error('MongoDB:', err.message) : console.error
mongoose.connection.on('error', mongoLog) // ponytail: global handler, per-env log level if more granularity needed
let cachedDb = null
async function connectDb() {
  if (cachedDb && mongoose.connection.readyState === 1) return
  cachedDb = await mongoose.connect(process.env.MONGO_URL)
}

export default async function handler(req, res) {
  try {
    await connectDb()
    return app(req, res)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}