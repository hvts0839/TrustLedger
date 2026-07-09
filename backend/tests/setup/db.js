import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

let mongoServer

export async function connectDB() {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
}

export async function disconnectDB() {
  await mongoose.disconnect()
  if (mongoServer) await mongoServer.stop()
}

export async function clearDB() {
  await Promise.all(Object.values(mongoose.models).map(m => m.deleteMany({})))
}

// ─── Test JWT helpers ────────────────────────────────────────────────────

const TEST_MSME_ID = 'test-msme-uid-12345'

export function generateTestToken(overrides = {}) {
  const payload = {
    sub: overrides.msmeId || TEST_MSME_ID,
    iss: 'https://securetoken.google.com/test-project',
    aud: 'test-project',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  }
  const key = global.__MOCK_PRIVATE_KEY__ || 'test-key'
  return jwt.sign(payload, key, {
    algorithm: 'RS256',
    header: { kid: global.__MOCK_KID__ || 'test-kid' },
  })
}

export { TEST_MSME_ID }

// ─── Idempotent auth middleware bypass for integration tests ──────────────
// We don't need to generate real Firebase tokens; we set a valid one in
// the Authorization header and the auth middleware will verify it using
// our mock fetch + mock keys.

export function authHeader(overrides = {}) {
  return { Authorization: `Bearer ${generateTestToken(overrides)}` }
}
