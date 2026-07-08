import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import express from 'express'
import supertest from 'supertest'
import { connectDB, disconnectDB, clearDB, authHeader, TEST_MSME_ID } from './setup/db.js'
import userRoutes from '../routes/users.js'
import User from '../models/User.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/users', userRoutes)
  return app
}

const app = createApp()
const request = supertest(app)

beforeAll(connectDB)
afterAll(disconnectDB)
beforeEach(clearDB)

function seedUser(overrides = {}) {
  return User.create({
    firebaseUid: TEST_MSME_ID,
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  })
}

describe('POST /users/check-lockout', () => {
  it('returns locked: false when user does not exist', async () => {
    const res = await request.post('/users/check-lockout').send({ email: 'unknown@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.locked).toBe(false)
  })

  it('returns locked: true when user is locked out', async () => {
    await seedUser({
      passwordAttempts: 0,
      passwordLockedUntil: new Date(Date.now() + 60000),
    })
    const res = await request.post('/users/check-lockout').send({ email: 'test@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.locked).toBe(true)
    expect(res.body.remainingMinutes).toBeGreaterThan(0)
  })

  it('returns locked: false for unlocked user', async () => {
    await seedUser()
    const res = await request.post('/users/check-lockout').send({ email: 'test@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.locked).toBe(false)
  })

  it('returns same response format when email is missing', async () => {
    const res = await request.post('/users/check-lockout').send({})
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('locked')
    expect(res.body).toHaveProperty('captchaRequired')
  })
})

describe('POST /users/record-failed-attempt', () => {
  it('increments passwordAttempts', async () => {
    await seedUser()
    for (let i = 0; i < 3; i++) {
      await request.post('/users/record-failed-attempt').send({ email: 'test@example.com' })
    }
    const user = await User.findOne({ email: 'test@example.com' })
    expect(user.passwordAttempts).toBe(3)
  })

  it('locks account after 5 attempts', async () => {
    await seedUser()
    for (let i = 0; i < 5; i++) {
      await request.post('/users/record-failed-attempt').send({ email: 'test@example.com' })
    }
    const user = await User.findOne({ email: 'test@example.com' })
    expect(user.passwordLockedUntil).toBeInstanceOf(Date)
    expect(user.passwordLockedUntil.getTime()).toBeGreaterThan(Date.now())
  })

  it('returns ok even for unknown email (enumeration prevention)', async () => {
    const res = await request.post('/users/record-failed-attempt').send({ email: 'nobody@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('POST /users/reset-attempts', () => {
  it('resets password attempts and lockout', async () => {
    await seedUser({
      passwordAttempts: 5,
      passwordLockedUntil: new Date(Date.now() + 60000),
    })
    await request.post('/users/reset-attempts').send({ email: 'test@example.com' })
    const user = await User.findOne({ email: 'test@example.com' })
    expect(user.passwordAttempts).toBe(0)
    expect(user.passwordLockedUntil).toBeNull()
  })

  it('handles unknown email gracefully', async () => {
    const res = await request.post('/users/reset-attempts').send({ email: 'nobody@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('PIN endpoints', () => {
  it('POST /users/pin/set rejects non-4-digit pin', async () => {
    const res = await request.post('/users/pin/set').set(authHeader()).send({ pin: '123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/4 digit/i)
  })

  it('POST /users/pin/set sets pin successfully', async () => {
    await seedUser()
    const res = await request.post('/users/pin/set').set(authHeader()).send({ pin: '1234' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    const user = await User.findOne({ firebaseUid: TEST_MSME_ID })
    expect(user.pinHash).toBeTruthy()
    expect(user.pinHash).toContain(':')
  })

  it('POST /users/pin/verify rejects wrong pin', async () => {
    await seedUser()
    await request.post('/users/pin/set').set(authHeader()).send({ pin: '1234' })
    const res = await request.post('/users/pin/verify').set(authHeader()).send({ pin: '5678' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/attempts? remaining/)
  })

  it('POST /users/pin/verify accepts correct pin', async () => {
    await seedUser()
    await request.post('/users/pin/set').set(authHeader()).send({ pin: '1234' })
    const res = await request.post('/users/pin/verify').set(authHeader()).send({ pin: '1234' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('locks pin after 5 wrong attempts', async () => {
    await seedUser()
    await request.post('/users/pin/set').set(authHeader()).send({ pin: '1234' })
    for (let i = 0; i < 5; i++) {
      await request.post('/users/pin/verify').set(authHeader()).send({ pin: '0000' })
    }
    const res = await request.post('/users/pin/verify').set(authHeader()).send({ pin: '1234' })
    expect(res.status).toBe(429)
    expect(res.body.error).toMatch(/locked|too many/i)
  })

  it('POST /users/pin/change rejects wrong current pin', async () => {
    await seedUser()
    await request.post('/users/pin/set').set(authHeader()).send({ pin: '1234' })
    const res = await request.post('/users/pin/change').set(authHeader()).send({ currentPin: '0000', newPin: '5678' })
    expect(res.status).toBe(401)
  })

  it('POST /users/pin/change changes pin with correct current pin', async () => {
    await seedUser()
    await request.post('/users/pin/set').set(authHeader()).send({ pin: '1234' })
    const res = await request.post('/users/pin/change').set(authHeader()).send({ currentPin: '1234', newPin: '5678' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('POST /users/pin/reset requires captcha when ip threshold reached', async () => {
    await seedUser()
    const ip = '10.0.0.1'
    for (let i = 0; i < 3; i++) {
      await request.post('/users/record-failed-attempt').set('X-Forwarded-For', ip).send({ email: 'other@test.com' })
    }
    const res = await request.post('/users/pin/reset').set(authHeader()).set('X-Forwarded-For', ip).send({ pin: '1234' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/captcha/i)
  })

  it('POST /users/pin/reset accepts captcha token', async () => {
    await seedUser()
    const res = await request.post('/users/pin/reset').set(authHeader()).send({ pin: '1234', captchaToken: 'test-token' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('POST /users/pin/reset rejects non-4-digit pin', async () => {
    const res = await request.post('/users/pin/reset').set(authHeader()).send({ pin: 'abc' })
    expect(res.status).toBe(400)
  })
})

describe('CAPTCHA integration', () => {
  it('captchaRequired is true after 3+ failed attempts from same IP', async () => {
    const ip = '10.0.0.99'
    for (let i = 0; i < 3; i++) {
      await request.post('/users/record-failed-attempt').set('X-Forwarded-For', ip).send({ email: 'any@test.com' })
    }
    const res = await request.post('/users/check-lockout').set('X-Forwarded-For', ip).send({ email: 'any@test.com' })
    expect(res.body.captchaRequired).toBe(true)
  })
})

describe('Email enumeration prevention', () => {
  it('check-lockout returns same structure for existing and non-existing emails', async () => {
    const res1 = await request.post('/users/check-lockout').send({ email: 'exists@example.com' })
    const res2 = await request.post('/users/check-lockout').send({ email: 'nonexistent@example.com' })
    expect(Object.keys(res1.body).sort()).toEqual(Object.keys(res2.body).sort())
  })
})
