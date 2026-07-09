const rateLimit = require('express-rate-limit')

const handler = (type) => (req, res) => {
  console.log(`[RATE-LIMIT] IP ${req.ip} exceeded ${type} limit`)
  res.status(429).json({ error: 'Too many attempts, please try again later.' })
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
  handler: handler('login'),
})

const forgotFlowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
  handler: handler('forgot-password/reset'),
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
  handler: handler('api'),
})

module.exports = { loginLimiter, forgotFlowLimiter, apiLimiter }
