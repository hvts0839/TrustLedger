const SystemConfig = require('../models/SystemConfig.js')

function monthlyRateFromBankRate(bankRatePercent) {
  return (bankRatePercent * 3 / 100) / 12
}

async function getRbiBankRate() {
  const config = await SystemConfig.getConfig()
  return config.rbiBankRate
}

async function getRateHistory() {
  const config = await SystemConfig.getConfig()
  return config.rateHistory || []
}

function rateForMonth(rateHistory, year, month, defaultRate) {
  if (!rateHistory || rateHistory.length === 0) return defaultRate
  const sorted = [...rateHistory].sort((a, b) => (b.year - a.year) || (b.month - a.month))
  for (const entry of sorted) {
    if (entry.year < year || (entry.year === year && entry.month <= month)) {
      return entry.rate
    }
  }
  return defaultRate
}

function calculateInterest(amount, deliveryDate, agreedTermsDays, asOfDate, bankRatePercent, rateHistory) {
  if (!amount || !deliveryDate) return { totalInterest: 0, breakdown: null }

  const due = new Date(deliveryDate)
  due.setDate(due.getDate() + (agreedTermsDays || 0))
  const asOf = asOfDate || new Date()

  if (due >= asOf) return { totalInterest: 0, breakdown: null }

  const daysOverdue = Math.floor((asOf - due) / 86400000)
  if (daysOverdue <= 0) return { totalInterest: 0, breakdown: null }

  const rate = bankRatePercent || 8.25
  const MONTH_PERIOD = 30
  let fullMonths = Math.floor(daysOverdue / MONTH_PERIOD)
  let remainingDays = daysOverdue % MONTH_PERIOD

  let compounded = amount
  const dueMonth = due.getMonth() + 1
  const dueYear = due.getFullYear()

  for (let m = 0; m < fullMonths; m++) {
    const monthOffset = (dueMonth + m - 1) % 12 + 1
    const yearOffset = dueYear + Math.floor((dueMonth + m - 1) / 12)
    const monthlyRate = monthlyRateFromBankRate(rateForMonth(rateHistory, yearOffset, monthOffset, rate))
    compounded = compounded * (1 + monthlyRate)
  }

  if (remainingDays > 0) {
    const monthOffset = (dueMonth + fullMonths - 1) % 12 + 1
    const yearOffset = dueYear + Math.floor((dueMonth + fullMonths - 1) / 12)
    const monthlyRate = monthlyRateFromBankRate(rateForMonth(rateHistory, yearOffset, monthOffset, rate))
    const dailyRate = monthlyRate / 30
    compounded += compounded * dailyRate * remainingDays
  }

  const totalInterest = Math.round((compounded - amount) * 100) / 100

  return {
    totalInterest,
    breakdown: {
      principal: amount,
      daysOverdue,
      fullMonths,
      remainingDays,
      annualApplicableRate: Math.round(rate * 3 * 100) / 100,
      monthlyRatePercent: Math.round(monthlyRateFromBankRate(rate) * 10000) / 100,
      compoundedPrincipal: Math.round(compounded * 100) / 100,
      bankRateUsed: rate,
    }
  }
}

function calculateInterestSync(amount, deliveryDate, agreedTermsDays, asOfDate, bankRatePercent) {
  if (!amount || !deliveryDate) return { totalInterest: 0, daysOverdue: 0 }

  const due = new Date(deliveryDate)
  due.setDate(due.getDate() + (agreedTermsDays || 0))
  const asOf = asOfDate || new Date()

  if (due >= asOf) return { totalInterest: 0, daysOverdue: 0 }

  const daysOverdue = Math.floor((asOf - due) / 86400000)
  if (daysOverdue <= 0) return { totalInterest: 0, daysOverdue: 0 }

  const rate = bankRatePercent || 8.25
  const monthlyRate = monthlyRateFromBankRate(rate)
  const dailyRate = monthlyRate / 30

  const fullMonths = Math.floor(daysOverdue / 30)
  const remainingDays = daysOverdue % 30

  let compounded = amount
  for (let m = 0; m < fullMonths; m++) {
    compounded = compounded * (1 + monthlyRate)
  }
  if (remainingDays > 0) {
    compounded += compounded * dailyRate * remainingDays
  }

  const totalInterest = Math.round((compounded - amount) * 100) / 100
  return { totalInterest, daysOverdue }
}

module.exports = { getRbiBankRate, getRateHistory, calculateInterest, calculateInterestSync }
