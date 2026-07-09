// ponytail: simple integer state machine — 4 states, 3 transition thresholds
// 0=Tracking, 1=Reminder, 2=Notice, 3=Escalated
// Resolved is handled separately via status='paid' + resolutionDate

export const STAGES = ['Tracking', 'Reminder', 'Notice', 'Escalated']

export function daysOverdue(deliveryDate, agreedTermsDays, asOf = new Date()) {
  const due = new Date(deliveryDate)
  due.setDate(due.getDate() + agreedTermsDays)
  return Math.floor((asOf - due) / 86400000)
}

export function stageForDays(overdueDays) {
  if (overdueDays <= 0) return 0
  if (overdueDays <= 14) return 1  // Reminder (day 1-14)
  if (overdueDays <= 29) return 2  // Notice (day 15-29)
  return 3                        // Escalated (day 30+)
}

export function transitionTo(invoice, targetStage, now = new Date()) {
  const updates = { escalationStage: targetStage, lastOverdueNotifiedAt: now }
  if (targetStage >= 2 && !invoice.overdueNoticeSentAt) updates.overdueNoticeSentAt = now
  if (targetStage === 3 && !invoice.resolutionDate) updates.resolutionDate = now
  return updates
}