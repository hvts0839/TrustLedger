const jwt = require('jsonwebtoken')

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'trustledger-747ba'
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'

let cachedKeys = null
let cacheExpires = 0

async function getFirebaseKey(kid) {
  if (cachedKeys && Date.now() < cacheExpires) return cachedKeys[kid]

  const res = await fetch(CERTS_URL)
  const keys = await res.json()

  const age = res.headers.get('cache-control') || ''
  const maxAge = parseInt(age.match(/max-age=(\d+)/)?.[1] || '86400', 10)
  cachedKeys = keys
  cacheExpires = Date.now() + maxAge * 1000

  return keys[kid]
}

async function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' })

  const token = header.slice(7)
  const decoded = jwt.decode(token, { complete: true })
  if (!decoded || !decoded.header || !decoded.header.kid) {
    return res.status(401).json({ error: 'invalid token' })
  }

  try {
    const publicKey = await getFirebaseKey(decoded.header.kid)
    if (!publicKey) return res.status(401).json({ error: 'invalid token' })

    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    })

    req.msmeId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
}

module.exports = auth
