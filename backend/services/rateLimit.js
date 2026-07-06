import rateLimit from 'express-rate-limit'

const handler = (type) => (req, res) => {
  console.log(`[RATE-LIMIT] IP ${req.ip} exceeded ${type} limit`)
  res.status(429).json({ error: 'Too many attempts, please try again later.' })
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
  handler: handler('login'),
})

export const forgotFlowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
  handler: handler('forgot-password/reset'),
})
