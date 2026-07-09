const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals')
const { connectDB, disconnectDB, clearDB, TEST_MSME_ID } = require('./setup/db.js')
const { runOverdueScan } = require('../services/overdueScan.js')
const Invoice = require('../models/Invoice.js')
const User = require('../models/User.js')

beforeAll(connectDB)
afterAll(disconnectDB)
beforeEach(clearDB)

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d
}

function makeInvoice(overrides = {}) {
  return Invoice.create({
    msmeId: TEST_MSME_ID,
    buyerName: 'Test Buyer',
    invoiceNumber: 'INV-TEST',
    amount: 10000,
    deliveryDate: overrides.deliveryDate || daysAgo(46),  // 1 day overdue (45 day terms + 1 overdue)
    agreedTermsDays: 45,
    status: 'outstanding',
    ...overrides,
  })
}

describe('runOverdueScan', () => {
  it('flags overdue invoices with escalationStage and lastOverdueNotifiedAt', async () => {
    const inv = await makeInvoice()
    const user = await User.create({
      firebaseUid: TEST_MSME_ID,
      name: 'Test User',
      email: 'test@example.com',
      emailReminders: true,
    })

    await runOverdueScan()

    const updated = await Invoice.findById(inv._id)
    expect(updated.escalationStage).toBe(1)
    expect(updated.lastOverdueNotifiedAt).toBeInstanceOf(Date)
  })

  it('does not touch invoices not yet due', async () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const inv = await makeInvoice({ deliveryDate: future, status: 'outstanding' })

    await runOverdueScan()

    const updated = await Invoice.findById(inv._id)
    expect(updated.escalationStage).toBe(0)
    expect(updated.lastOverdueNotifiedAt).toBeUndefined()
  })

  it('does not flag paid invoices', async () => {
    const inv = await makeInvoice({ status: 'paid' })

    await runOverdueScan()

    const updated = await Invoice.findById(inv._id)
    expect(updated.escalationStage).toBe(0)
  })

  it('is idempotent — running twice does not double escalate', async () => {
    await makeInvoice()
    await User.create({ firebaseUid: TEST_MSME_ID, name: 'Test', email: 'test@test.com', emailReminders: true })

    await runOverdueScan()
    await runOverdueScan()

    const invoices = await Invoice.find()
    for (const inv of invoices) {
      if (inv.status === 'outstanding' && inv.lastOverdueNotifiedAt) {
        expect(inv.escalationStage).toBe(1)
      }
    }
  })

  it('handles empty invoice list gracefully', async () => {
    // No invoices at all
    await expect(runOverdueScan()).resolves.not.toThrow()
  })

  it('scans only outstanding invoices', async () => {
    await makeInvoice({ status: 'paid', invoiceNumber: 'PAID-1' })
    await makeInvoice({ status: 'outstanding', invoiceNumber: 'OUT-1' })

    await runOverdueScan()

    const paid = await Invoice.findOne({ invoiceNumber: 'PAID-1' })
    const outstanding = await Invoice.findOne({ invoiceNumber: 'OUT-1' })
    expect(paid.escalationStage).toBe(0)
    expect(outstanding.escalationStage).toBe(1)
  })

  it('does not re-notify if already notified today', async () => {
    const today = new Date()
    await makeInvoice({
      escalationStage: 2,
      lastOverdueNotifiedAt: today,
    })

    await runOverdueScan()

    const updated = await Invoice.findOne({ invoiceNumber: 'INV-TEST' })
    expect(updated.escalationStage).toBe(2)
  })
})
