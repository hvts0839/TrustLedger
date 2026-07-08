import { describe, it, expect } from '@jest/globals'
import { calculateInterest, calculateInterestSync } from '../services/interest.js'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function futureDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

const BANK_RATE = 8.25
const MONTHLY_RATE = (BANK_RATE * 3 / 100) / 12
const DAILY_RATE = MONTHLY_RATE / 30

function expectedInterest(amount, daysOverdue) {
  const fullMonths = Math.floor(daysOverdue / 30)
  const remDays = daysOverdue % 30
  let compounded = amount
  for (let m = 0; m < fullMonths; m++) {
    compounded = compounded * (1 + MONTHLY_RATE)
  }
  if (remDays > 0) {
    compounded += compounded * DAILY_RATE * remDays
  }
  return Math.round((compounded - amount) * 100) / 100
}

describe('calculateInterestSync', () => {
  it('returns 0 for not-yet-overdue invoice', () => {
    const result = calculateInterestSync(100000, futureDays(10), 45, new Date(), BANK_RATE)
    expect(result.totalInterest).toBe(0)
    expect(result.daysOverdue).toBe(0)
  })

  it('returns 0 when no amount or deliveryDate', () => {
    expect(calculateInterestSync(null, '2025-01-01', 45, '2025-03-01').totalInterest).toBe(0)
    expect(calculateInterestSync(100000, null, 45, '2025-03-01').totalInterest).toBe(0)
  })

  it('calculates interest for 10 days overdue', () => {
    const amt = 100000
    const result = calculateInterestSync(amt, daysAgo(55), 45, new Date(), BANK_RATE)
    expect(result.daysOverdue).toBe(10)
    expect(result.totalInterest).toBeCloseTo(expectedInterest(amt, 10), 1)
  })

  it('calculates interest for 45 days overdue with compounding', () => {
    const amt = 100000
    const result = calculateInterestSync(amt, daysAgo(90), 45, new Date(), BANK_RATE)
    expect(result.daysOverdue).toBe(45)
    expect(result.totalInterest).toBeCloseTo(expectedInterest(amt, 45), 1)
  })

  it('calculates interest for 120 days overdue with multi-month compounding', () => {
    const amt = 100000
    const result = calculateInterestSync(amt, daysAgo(165), 45, new Date(), BANK_RATE)
    expect(result.daysOverdue).toBe(120)
    expect(result.totalInterest).toBeCloseTo(expectedInterest(amt, 120), 1)
  })

  it('stops interest at payment date', () => {
    const amt = 100000
    const delivery = daysAgo(100)
    const paymentDate = daysAgo(30)
    const result = calculateInterestSync(amt, delivery, 45, paymentDate, BANK_RATE)
    const laterResult = calculateInterestSync(amt, delivery, 45, new Date(), BANK_RATE)
    expect(result.totalInterest).toBeLessThan(laterResult.totalInterest)
  })

  it('uses default bank rate when none provided', () => {
    const result = calculateInterestSync(100000, daysAgo(55), 45, new Date())
    expect(result.totalInterest).toBeGreaterThan(0)
  })
})

describe('calculateInterest', () => {
  it('returns breakdown with expected fields', () => {
    const result = calculateInterest(100000, daysAgo(55), 45, new Date(), BANK_RATE, [])
    expect(result.breakdown).toBeDefined()
    expect(result.breakdown.principal).toBe(100000)
    expect(result.breakdown.daysOverdue).toBe(10)
    expect(result.breakdown.annualApplicableRate).toBe(24.75)
    expect(result.breakdown.bankRateUsed).toBe(BANK_RATE)
    expect(result.breakdown.compoundedPrincipal).toBeDefined()
    expect(result.breakdown.monthlyRatePercent).toBeCloseTo(2.06, 0)
  })

  it('handles rateHistory change in later months', () => {
    const amt = 100000
    const rateHistory = [{ year: 2025, month: 2, rate: 7.0 }]
    const withHistory = calculateInterest(amt, new Date('2024-10-01'), 45, new Date('2025-03-15'), BANK_RATE, rateHistory)
    const withoutHistory = calculateInterest(amt, new Date('2024-10-01'), 45, new Date('2025-03-15'), BANK_RATE, [])
    expect(withHistory.totalInterest).toBeGreaterThan(0)
    expect(withHistory.totalInterest).toBeLessThan(withoutHistory.totalInterest)
  })

  it('rateHistory is forward-only — does not affect past months', () => {
    const amt = 100000
    const rateHistory = [{ year: 2025, month: 3, rate: 7.0 }]
    const beforeChange = calculateInterest(amt, new Date('2024-11-01'), 45, new Date('2024-12-31'), BANK_RATE, rateHistory)
    const without = calculateInterest(amt, new Date('2024-11-01'), 45, new Date('2024-12-31'), BANK_RATE, [])
    expect(beforeChange.totalInterest).toBe(without.totalInterest)
  })

  it('returns 0 for not-yet-overdue with rateHistory', () => {
    const result = calculateInterest(100000, futureDays(10), 45, new Date(), BANK_RATE, [])
    expect(result.totalInterest).toBe(0)
  })
})

describe('Indian number formatting', () => {
  it('formats in Indian locale', () => {
    expect((100000).toLocaleString('en-IN')).toBe('1,00,000')
    expect((10000000).toLocaleString('en-IN')).toBe('1,00,00,000')
    expect((1250).toLocaleString('en-IN', { minimumFractionDigits: 2 })).toBe('1,250.00')
  })
})
