const Invoice = require('../models/Invoice.js')

async function calculateBuyerScore(msmeId, buyerId) {
  const invoices = await Invoice.find({ msmeId, buyerId }).lean()
  if (!invoices.length) return { score: null, totalInvoices: 0, avgDaysLate: null, overdueRate: null, confidence: null }

  let overdueCount = 0
  let totalDaysLate = 0
  let resolvedCount = 0

  for (const inv of invoices) {
    const due = new Date(inv.deliveryDate)
    due.setDate(due.getDate() + inv.agreedTermsDays)

    if (new Date(due) >= new Date()) continue

    if (inv.status !== 'paid') continue
    const paidAt = new Date(inv.updatedAt)
    const daysLate = Math.max(0, Math.floor((paidAt - due) / 86400000))

    if (daysLate > 0) overdueCount++
    totalDaysLate += daysLate
    resolvedCount++
  }

  if (!resolvedCount) return { score: null, totalInvoices: invoices.length, avgDaysLate: null, overdueRate: null, confidence: 'low' }

  const avgDaysLate = Math.round(totalDaysLate / resolvedCount)
  const overdueRate = Math.round((overdueCount / resolvedCount) * 100)

  const onTimeWeight = 70
  const severityWeight = 30
  const onTimeScore = (1 - overdueCount / resolvedCount) * 100
  const severityScore = Math.max(0, 100 - avgDaysLate * 1.1)
  const score = Math.round(onTimeScore * (onTimeWeight / 100) + severityScore * (severityWeight / 100))

  const confidence = resolvedCount >= 5 ? 'high' : resolvedCount >= 2 ? 'medium' : 'low'

  return { score, totalInvoices: invoices.length, avgDaysLate, overdueRate, confidence }
}

module.exports = { calculateBuyerScore }