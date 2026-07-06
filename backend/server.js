import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import mongoSanitize from 'express-mongo-sanitize'
import auth from './middleware/auth.js'
import invoiceRoutes from './routes/invoices.js'
import userRoutes from './routes/users.js'
import systemRoutes from './routes/system.js'
import { loginLimiter, forgotFlowLimiter } from './services/rateLimit.js'
import { fingerprint, buildDeviceInfo } from './services/deviceFingerprint.js'
import { sendAlertEmail, buildLockoutEmail, buildNewDeviceEmail } from './services/mail.js'
import { startOverdueScan } from './services/overdueScan.js'
import { startRbiRateCheck } from './services/rbiRateCheck.js'
import User from './models/User.js'

const app = express()

app.use(cors())
app.set('trust proxy', 1)
app.use(express.json())
app.use(mongoSanitize())

app.use((req, res, next) => {
  req.fingerprint = fingerprint(req)
  req.deviceInfo = buildDeviceInfo(req)
  next()
})

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/users/check-lockout', loginLimiter)
app.use('/users/record-failed-attempt', loginLimiter)
app.use('/users/reset-attempts', loginLimiter)
app.use('/users/pin/verify', loginLimiter)
app.use('/users/pin/reset', forgotFlowLimiter)
app.use('/users/send-otp', forgotFlowLimiter)
app.use('/users/verify-otp', loginLimiter)

app.use('/users', userRoutes)
app.use('/invoices', auth, invoiceRoutes)
app.use('/system', systemRoutes)

if (!process.env.MONGO_URL) {
  console.error('MONGO_URL not set — copy backend/.env.example to backend/.env and fill it in')
  process.exit(1)
}
mongoose.connect(process.env.MONGO_URL).then(() => {
  startOverdueScan()
  startRbiRateCheck()
  app.listen(process.env.PORT || 3000, () => console.log('up'))
})
