const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals')
const express = require('express')
const supertest = require('supertest')
const { connectDB, disconnectDB, clearDB, authHeader, TEST_MSME_ID } = require('./setup/db.js')
const userRoutes = require('../routes/users.js')
const User = require('../models/User.js')

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

describe('GET /users/me', () => {
  it('returns 404 when no user exists', async () => {
    const res = await request.get('/users/me').set(authHeader())
    expect(res.status).toBe(404)
  })

  it('returns own user data', async () => {
    await User.create({
      firebaseUid: TEST_MSME_ID,
      name: 'Test User',
      email: 'test@example.com',
      companyName: 'Test Corp',
    })
    const res = await request.get('/users/me').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Test User')
    expect(res.body.email).toBe('test@example.com')
    expect(res.body.companyName).toBe('Test Corp')
  })
})

describe('POST /users/me (create user)', () => {
  it('creates user if not exists', async () => {
    const res = await request.post('/users/me').set(authHeader()).send({ name: 'New User', email: 'new@example.com' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('New User')
  })

  it('returns existing user without duplicating', async () => {
    await User.create({ firebaseUid: TEST_MSME_ID, name: 'Existing' })
    const res = await request.post('/users/me').set(authHeader()).send({ name: 'Should Not Change' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Existing')
  })
})

describe('PATCH /users/me', () => {
  beforeEach(async () => {
    await User.create({
      firebaseUid: TEST_MSME_ID,
      name: 'Original',
      companyName: '',
      udyamNumber: '',
      email: 'orig@test.com',
      phone: '',
      profileComplete: false,
      emailReminders: true,
      dataSharing: false,
    })
  })

  it('updates whitelisted fields', async () => {
    const res = await request.patch('/users/me').set(authHeader()).send({
      name: 'Updated Name',
      companyName: 'Updated Corp',
      emailReminders: false,
    })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated Name')
    expect(res.body.companyName).toBe('Updated Corp')
    expect(res.body.emailReminders).toBe(false)
  })

  it('ignores unknown fields', async () => {
    const res = await request.patch('/users/me').set(authHeader()).send({
      name: 'Test',
      role: 'admin',
      secret: 'hack',
    })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Test')
    expect(res.body.role).toBeUndefined()
    expect(res.body.secret).toBeUndefined()
  })

  it('rejects string where number expected (schema validation)', async () => {
    const res = await request.patch('/users/me').set(authHeader()).send({
      emailReminders: 'not-a-boolean',
    })
    expect(res.status).toBe(400)
  })
})

describe('profileComplete behavior', () => {
  it('can set profileComplete to true via API', async () => {
    await User.create({
      firebaseUid: TEST_MSME_ID,
      name: 'Complete User',
      email: 'complete@test.com',
      phone: '9999999999',
      companyName: 'My Corp',
    })
    const res = await request.patch('/users/me').set(authHeader()).send({ profileComplete: true })
    expect(res.status).toBe(200)
    expect(res.body.profileComplete).toBe(true)
  })

  it('profileComplete can be set to false', async () => {
    await User.create({
      firebaseUid: TEST_MSME_ID,
      name: 'User',
      profileComplete: true,
    })
    const res = await request.patch('/users/me').set(authHeader()).send({ profileComplete: false })
    expect(res.body.profileComplete).toBe(false)
  })
})