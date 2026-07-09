import Invoice from '../models/Invoice.js'

// ponytail: per-MSME reliability — no cross-MSME aggregation, no anonymization needed yet
export async function calculateBuyerScore(msmeId, buyerId) {
  const invoices = await Invoice.find({ msmeId, buyerId }).lean()
  if (!invoices.length) return { score: null, totalInvoices: 0, avgDaysLate: null, overdueRate: null, confidence: null }

  let overdueCount = 0
  let totalDaysLate = 0
  let resolvedCount = 0

  for (const inv of invoices) {
    const due = new Date(inv.deliveryDate)
    due.setDate(due.getDate() + inv.agreedTermsDays)

    if (new Date(due) >= new Date()) continue  // not yet due

    // avgDaysLate only counts resolved/paid invoices per task spec
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

  // ponytail: score = 100 - weighted penalty for lateness + severity
  // 70% weight: on-time rate (% of resolved invoices paid on or before due date)
  // 30% weight: severity (0 when avg >90 days late, interpolated linearly 100→0 over 0→90 days)
  // Score floored at 0.
  // Rationale: a buyer who pays 80% on time but averages 45 days late on the rest is worse than
  // one who pays 80% on time and averages 10 days late. The severity term captures this.
  const onTimeWeight = 70
  const severityWeight = 30
  const onTimeScore = (1 - overdueCount / resolvedCount) * 100
  const severityScore = Math.max(0, 100 - avgDaysLate * 1.1)
  const score = Math.round(onTimeScore * (onTimeWeight / 100) + severityScore * (severityWeight / 100))

  const confidence = resolvedCount >= 5 ? 'high' : resolvedCount >= 2 ? 'medium' : 'low'

  return { score, totalInvoices: invoices.length, avgDaysLate, overdueRate, confidence }
}