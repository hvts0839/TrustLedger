import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import express from 'express'
import supertest from 'supertest'
import { connectDB, disconnectDB, clearDB, authHeader, TEST_MSME_ID } from './setup/db.js'
import invoiceRoutes from '../routes/invoices.js'
import Invoice from '../models/Invoice.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/invoices', invoiceRoutes)
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

  it('returns 400 when buyerName is missing', async () => {
    const res = await request.post('/invoices').set(authHeader()).send(validPayload({ buyerName: undefined }))
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
    expect(res.body.fields.buyerName).toBeDefined()
  })

  it('returns 400 when amount is missing', async () => {
    const res = await request.post('/invoices').set(authHeader()).send(validPayload({ amount: undefined }))
    expect(res.status).toBe(400)
    expect(res.body.fields.amount).toBeDefined()
  })

  it('returns 400 when deliveryDate is missing', async () => {
    const res = await request.post('/invoices').set(authHeader()).send(validPayload({ deliveryDate: undefined }))
    expect(res.status).toBe(400)
    expect(res.body.fields.deliveryDate).toBeDefined()
  })

  it('returns 400 for wrong types', async () => {
    const res = await request.post('/invoices').set(authHeader()).send(validPayload({ amount: 'not-a-number' }))
    expect(res.status).toBe(400)
    expect(res.body.fields.amount).toBeDefined()
  })

  it('rejects unknown fields', async () => {
    const res = await request.post('/invoices').set(authHeader()).send({ ...validPayload(), secretField: 'xyz' })
    expect(res.status).toBe(400)
    expect(res.body.fields.secretField).toMatch(/unknown/i)
  })

  it('rejects amount <= 0', async () => {
    const res = await request.post('/invoices').set(authHeader()).send(validPayload({ amount: 0 }))
    expect(res.status).toBe(400)
    expect(res.body.fields.amount).toMatch(/positive/i)
  })

  it('rejects agreedTermsDays > 365', async () => {
    const res = await request.post('/invoices').set(authHeader()).send(validPayload({ agreedTermsDays: 500 }))
    expect(res.status).toBe(400)
    expect(res.body.fields.agreedTermsDays).toMatch(/1 and 365/i)
  })
})

describe('PATCH /invoices/:id', () => {
  it('updates invoice fields', async () => {
    const inv = await seedInvoice()
    const res = await request.patch(`/invoices/${inv._id}`).set(authHeader()).send({ buyerName: 'Updated Buyer' })
    expect(res.status).toBe(200)
    expect(res.body.buyerName).toBe('Updated Buyer')
  })

  it('returns 404 when editing another user invoice', async () => {
    const inv = await seedInvoice({ msmeId: OTHER_MSME_ID })
    const res = await request.patch(`/invoices/${inv._id}`).set(authHeader()).send({ buyerName: 'Hack' })
    expect(res.status).toBe(404)
  })

  it('returns 400 for empty body', async () => {
    const inv = await seedInvoice()
    const res = await request.patch(`/invoices/${inv._id}`).set(authHeader()).send({})
    expect(res.status).toBe(400)
  })
})

describe('DELETE /invoices/:id', () => {
  it('deletes own invoice', async () => {
    const inv = await seedInvoice()
    const res = await request.delete(`/invoices/${inv._id}`).set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    const deleted = await Invoice.findById(inv._id)
    expect(deleted).toBeNull()
  })

  it('returns 404 when deleting another user invoice', async () => {
    const inv = await seedInvoice({ msmeId: OTHER_MSME_ID })
    const res = await request.delete(`/invoices/${inv._id}`).set(authHeader())
    expect(res.status).toBe(404)
  })

  it('returns 404 for nonexistent id', async () => {
    const res = await request.delete('/invoices/000000000000000000000000').set(authHeader())
    expect(res.status).toBe(404)
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

  it('filters by amount range', async () => {
    const res = await request.get('/invoices').set(authHeader()).query({ amountMin: 4000, amountMax: 8000 })
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].amount).toBe(5000)
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

  it('filters by daysOverdueMin', async () => {
    const res = await request.get('/invoices/overdue').set(authHeader()).query({ daysOverdueMin: 10 })
    expect(res.status).toBe(200)
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

describe('GET /invoices/transactions', () => {
  it('returns paid invoices with interest info', async () => {
    const past = new Date()
    past.setFullYear(past.getFullYear() - 1)
    await Invoice.create({
      msmeId: TEST_MSME_ID,
      buyerName: 'Paid Buyer',
      invoiceNumber: 'TRX1',
      amount: 10000,
      deliveryDate: past,
      agreedTermsDays: 30,
      status: 'paid',
    })
    const res = await request.get('/invoices/transactions').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /invoices/interest', () => {
  it('returns accrued interest for overdue invoices', async () => {
    const past = new Date()
    past.setFullYear(past.getFullYear() - 1)
    await Invoice.create({
      msmeId: TEST_MSME_ID,
      buyerName: 'Interest Co',
      invoiceNumber: 'INT1',
      amount: 10000,
      deliveryDate: past,
      agreedTermsDays: 30,
      status: 'outstanding',
    })
    const res = await request.get('/invoices/interest').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data[0]).toHaveProperty('interestAccrued')
  })
})

describe('GET /invoices/stats', () => {
  it('returns stats aggregation', async () => {
    await Invoice.create({
      msmeId: TEST_MSME_ID,
      buyerName: 'Stats Co',
      invoiceNumber: 'ST1',
      amount: 10000,
      deliveryDate: new Date(),
      agreedTermsDays: 30,
      status: 'outstanding',
    })
    const res = await request.get('/invoices/stats').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalOutstanding')
    expect(res.body).toHaveProperty('totalOverdue')
    expect(res.body).toHaveProperty('overdueCount')
    expect(res.body).toHaveProperty('outstandingCount')
    expect(res.body).toHaveProperty('monthlyData')
  })
})

describe('Ownership enforcement', () => {
  it('GET /invoices/:id returns 404 for other user invoice', async () => {
    const inv = await seedInvoice({ msmeId: OTHER_MSME_ID })
    const res = await request.get(`/invoices/${inv._id}`).set(authHeader())
    expect(res.status).toBe(404)
  })

  it('GET /invoices/:id returns own invoice', async () => {
    const inv = await seedInvoice()
    const res = await request.get(`/invoices/${inv._id}`).set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body._id).toBe(inv._id.toString())
  })
})

describe('Invalid query params', () => {
  it('negative page number does not crash', async () => {
    const res = await request.get('/invoices').set(authHeader()).query({ page: -1 })
    expect(res.status).toBe(200)
  })

  it('invalid dateFrom is handled', async () => {
    const res = await request.get('/invoices').set(authHeader()).query({ dateFrom: 'not-a-date' })
    expect(res.status).toBe(200)
  })
})
