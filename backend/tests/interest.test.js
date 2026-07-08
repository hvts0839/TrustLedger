import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { connectDB, disconnectDB, clearDB } from './setup/db.js'
import Invoice from '../models/Invoice.js'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

beforeAll(connectDB)
afterAll(disconnectDB)
beforeEach(clearDB)

describe('Invoice virtual interestAccrued', () => {
  it('returns positive interest for overdue invoice', async () => {
    const invoice = await Invoice.create({
      msmeId: 'test',
      buyerName: 'Buyer A',
      invoiceNumber: 'INV-001',
      amount: 100000,
      deliveryDate: daysAgo(100),
      agreedTermsDays: 45,
    })
    expect(invoice.interestAccrued).toBeGreaterThan(0)
  })

  it('returns 0 for paid invoice even if overdue', async () => {
    const invoice = await Invoice.create({
      msmeId: 'test',
      buyerName: 'Buyer B',
      invoiceNumber: 'INV-002',
      amount: 50000,
      deliveryDate: daysAgo(200),
      agreedTermsDays: 30,
      status: 'paid',
    })
    expect(invoice.interestAccrued).toBe(0)
  })
})
