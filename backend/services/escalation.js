const STAGES = ['Tracking', 'Reminder', 'Notice', 'Escalated']

function daysOverdue(deliveryDate, agreedTermsDays, asOf = new Date()) {
  const due = new Date(deliveryDate)
  due.setDate(due.getDate() + agreedTermsDays)
  return Math.floor((asOf - due) / 86400000)
}

function stageForDays(overdueDays) {
  if (overdueDays <= 0) return 0
  if (overdueDays <= 14) return 1
  if (overdueDays <= 29) return 2
  return 3
}

function transitionTo(invoice, targetStage, now = new Date()) {
  const updates = { escalationStage: targetStage, lastOverdueNotifiedAt: now }
  if (targetStage >= 2 && !invoice.overdueNoticeSentAt) updates.overdueNoticeSentAt = now
  if (targetStage === 3 && !invoice.resolutionDate) updates.resolutionDate = now
  return updates
}

module.exports = { STAGES, daysOverdue, stageForDays, transitionTo }