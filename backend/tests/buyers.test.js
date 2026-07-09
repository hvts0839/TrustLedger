import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import express from 'express'
import supertest from 'supertest'
import { connectDB, disconnectDB, clearDB, authHeader, TEST_MSME_ID } from './setup/db.js'
import buyerRoutes from '../routes/buyers.js'
import Invoice from '../models/Invoice.js'
import Buyer from '../models/Buyer.js'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/buyers', buyerRoutes)
  return app
}

const app = createApp()
const request = supertest(app)
const OTHER_MSME = 'other-msme-67890'

const BASE = new Date('2025-06-01T00:00:00Z')

function d(daysAgo) { const d = new Date(BASE); d.setDate(d.getDate() - daysAgo); return d }

beforeAll(connectDB)
afterAll(disconnectDB)
beforeEach(clearDB)

describe('GET /buyers/:id/reliability', () => {
  it('returns 404 for nonexistent buyer', async () => {
    const res = await request.get('/buyers/000000000000000000000000/reliability').set(authHeader())
    expect(res.status).toBe(404)
  })

  it('returns null score when no resolved invoices', async () => {
    const buyer = await Buyer.create({ msmeId: TEST_MSME_ID, name: 'New Buyer' })
    await Invoice.create({ msmeId: TEST_MSME_ID, buyerId: buyer._id, buyerName: 'New Buyer', invoiceNumber: 'I1', amount: 1000, deliveryDate: d(100), agreedTermsDays: 30, status: 'outstanding' })
    const res = await request.get(`/buyers/${buyer._id}/reliability`).set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.score).toBeNull()
    expect(res.body.confidence).toBe('low')
  })

  // delivery: d(45) → 2025-04-17, terms 30 → due 2025-05-17 (15 days before BASE)
  // paid 5 days before BASE → 2025-05-27 → 10 days after due → 10 days late
  it('scores a 10-day-late single invoice', async () => {
    const buyer = await Buyer.create({ msmeId: TEST_MSME_ID, name: 'Late Co' })
    const inv = await Invoice.create({ msmeId: TEST_MSME_ID, buyerId: buyer._id, buyerName: 'Late Co', invoiceNumber: 'L1', amount: 5000, deliveryDate: d(60), agreedTermsDays: 30, status: 'paid' })
    await Invoice.collection.updateOne({ _id: inv._id }, { $set: { updatedAt: d(5) } })
    const res = await request.get(`/buyers/${buyer._id}/reliability`).set(authHeader())
    expect(res.status).toBe(200)
    // delivery d(60) = Apr 2, 2025, terms 30 → due May 2, 2025
    // paid (updatedAt) = d(5) = May 27, 2025 → 25 days late
    expect(res.body.avgDaysLate).toBe(25)
    expect(res.body.overdueRate).toBe(100)
    // onTimeScore=0, severityScore=100-25*1.1=72.5, score=0*0.7+72.5*0.3=21.75→22
    expect(res.body.score).toBe(22)
  })

  // inv1: delivery d(65) = Mar 28, 2025, terms 30 → due Apr 27, 2025
  //       paid (updatedAt) d(15) = May 17, 2025 → 20 days late
  // inv2: delivery d(60) = Apr 2, 2025, terms 30 → due May 2, 2025
  //       paid (updatedAt) d(15) = May 17, 2025 → 15 days late
  // inv3: outstanding → skipped
  it('avgDaysLate only counts paid invoices, not outstanding', async () => {
    const buyer = await Buyer.create({ msmeId: TEST_MSME_ID, name: 'Mixed Co' })
    const inv1 = await Invoice.create({ msmeId: TEST_MSME_ID, buyerId: buyer._id, buyerName: 'Mixed Co', invoiceNumber: 'M1', amount: 1000, deliveryDate: d(65), agreedTermsDays: 30, status: 'paid' })
    await Invoice.collection.updateOne({ _id: inv1._id }, { $set: { updatedAt: d(15) } })
    const inv2 = await Invoice.create({ msmeId: TEST_MSME_ID, buyerId: buyer._id, buyerName: 'Mixed Co', invoiceNumber: 'M2', amount: 2000, deliveryDate: d(60), agreedTermsDays: 30, status: 'paid' })
    await Invoice.collection.updateOne({ _id: inv2._id }, { $set: { updatedAt: d(15) } })
    await Invoice.create({ msmeId: TEST_MSME_ID, buyerId: buyer._id, buyerName: 'Mixed Co', invoiceNumber: 'M3', amount: 3000, deliveryDate: d(40), agreedTermsDays: 30, status: 'outstanding' })
    const res = await request.get(`/buyers/${buyer._id}/reliability`).set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.avgDaysLate).toBe(18)  // round((20+15)/2)
    expect(res.body.totalInvoices).toBe(3)
    expect(res.body.confidence).toBe('medium')
  })

  it('returns 404 for a buyer owned by another MSME', async () => {
    const buyer = await Buyer.create({ msmeId: OTHER_MSME, name: 'Not Yours' })
    const res = await request.get(`/buyers/${buyer._id}/reliability`).set(authHeader())
    expect(res.status).toBe(404)
  })
})