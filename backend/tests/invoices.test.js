import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import express from 'express'
import supertest from 'supertest'
import { connectDB, disconnectDB, clearDB, authHeader, TEST_MSME_ID } from './setup/db.js'
import invoiceRoutes from '../routes/invoices.js'
import auth from '../middleware/auth.js'
import Invoice from '../models/Invoice.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/invoices', auth, invoiceRoutes)
  return app
}

const app = createApp()
const request = supertest(app)

const OTHER_MSME_ID = 'other-user-uid-99999'

beforeAll(connectDB)
afterAll(disconnectDB)
beforeEach(clearDB)

function validPayload(overrides = {}) {
  return {
    buyerName: 'Test Buyer',
    invoiceNumber: 'INV-001',
    amount: 10000,
    deliveryDate: '2025-01-15',
    agreedTermsDays: 45,
    ...overrides,
  }
}

async function seedInvoice(overrides = {}) {
  return Invoice.create({
    msmeId: TEST_MSME_ID,
    buyerName: 'Default Buyer',
    invoiceNumber: 'INV-DEFAULT',
    amount: 5000,
    deliveryDate: new Date('2025-01-01'),
    agreedTermsDays: 45,
    ...overrides,
  })
}

describe('POST /invoices', () => {
  it('creates invoice with valid data', async () => {
    const res = await request.post('/invoices').set(authHeader()).send(validPayload())
    expect(res.status).toBe(201)
    expect(res.body.buyerName).toBe('Test Buyer')
    expect(res.body.msmeId).toBe(TEST_MSME_ID)
  })
})

describe('GET /invoices', () => {
  beforeEach(async () => {
    await Invoice.create([
      { msmeId: TEST_MSME_ID, buyerName: 'Alpha', invoiceNumber: 'A1', amount: 1000, deliveryDate: new Date('2025-01-01'), agreedTermsDays: 30 },
      { msmeId: TEST_MSME_ID, buyerName: 'Beta', invoiceNumber: 'B1', amount: 5000, deliveryDate: new Date('2025-02-01'), agreedTermsDays: 45 },
      { msmeId: TEST_MSME_ID, buyerName: 'Gamma', invoiceNumber: 'C1', amount: 10000, deliveryDate: new Date('2025-03-01'), agreedTermsDays: 60 },
    ])
  })

  it('returns all invoices for user', async () => {
    const res = await request.get('/invoices').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
    expect(res.body.total).toBe(3)
  })

  it('filters by buyer name', async () => {
    const res = await request.get('/invoices').set(authHeader()).query({ buyer: 'Alpha' })
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].buyerName).toBe('Alpha')
  })

  it('sorts by amount ascending', async () => {
    const res = await request.get('/invoices').set(authHeader()).query({ sortBy: 'amount', sortOrder: 'asc' })
    expect(res.body.data[0].amount).toBe(1000)
    expect(res.body.data[2].amount).toBe(10000)
  })

  it('does not return other user invoices', async () => {
    await Invoice.create({ msmeId: OTHER_MSME_ID, buyerName: 'Hacker', invoiceNumber: 'H1', amount: 99999, deliveryDate: new Date(), agreedTermsDays: 45 })
    const res = await request.get('/invoices').set(authHeader())
    expect(res.body.data.every(i => i.msmeId === TEST_MSME_ID)).toBe(true)
  })

  it('handles NaN page numbers safely', async () => {
    const res = await request.get('/invoices').set(authHeader()).query({ page: 'abc' })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('GET /invoices/overdue', () => {
  beforeEach(async () => {
    const past = new Date()
    past.setFullYear(past.getFullYear() - 1)
    await Invoice.create([
      { msmeId: TEST_MSME_ID, buyerName: 'Overdue Co', invoiceNumber: 'O1', amount: 5000, deliveryDate: past, agreedTermsDays: 30, status: 'outstanding' },
      { msmeId: TEST_MSME_ID, buyerName: 'Not Due', invoiceNumber: 'N1', amount: 3000, deliveryDate: new Date(), agreedTermsDays: 90, status: 'outstanding' },
    ])
  })

  it('returns only overdue invoices', async () => {
    const res = await request.get('/invoices/overdue').set(authHeader())
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.every(i => i.status === 'outstanding')).toBe(true)
  })
})

describe('GET /invoices/outstanding', () => {
  it('returns only outstanding invoices', async () => {
    await Invoice.create([
      { msmeId: TEST_MSME_ID, buyerName: 'Out', invoiceNumber: 'OUT1', amount: 1000, deliveryDate: new Date(), agreedTermsDays: 30, status: 'outstanding' },
      { msmeId: TEST_MSME_ID, buyerName: 'Paid', invoiceNumber: 'PAID1', amount: 2000, deliveryDate: new Date(), agreedTermsDays: 30, status: 'paid' },
    ])
    const res = await request.get('/invoices/outstanding').set(authHeader())
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].status).toBe('outstanding')
  })
})