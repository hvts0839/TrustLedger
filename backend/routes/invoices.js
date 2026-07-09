import { Router } from 'express'
import Invoice from '../models/Invoice.js'
import { calculateInterest, getRbiBankRate, getRateHistory } from '../services/interest.js'
import { createNotification } from '../services/notify.js'
import { daysOverdue, stageForDays, STAGES } from '../services/escalation.js'
import { generateNoticePDF } from '../services/pdf.js'
import User from '../models/User.js'
import SystemConfig from '../models/SystemConfig.js'

const router = Router()

function wrapAsync(fn) {
  return (req, res, next) => fn(req, res, next).catch(next)
}

function overdueFilter() {
  const now = new Date()
  return { status: 'outstanding', $expr: { $lt: [{ $add: ['$deliveryDate', { $multiply: ['$agreedTermsDays', 86400000] }] }, now] } }
}

function buildQuery(baseFilter, query) {
  const { sortBy, sortOrder, buyer, amountMin, amountMax, dateFrom, dateTo, status, daysOverdueMin, daysOverdueMax, page, limit } = query

  const filter = { ...baseFilter }
  if (buyer) filter.buyerName = { $regex: buyer, $options: 'i' }
  if (amountMin || amountMax) { filter.amount = {}; if (amountMin) filter.amount.$gte = Number(amountMin); if (amountMax) filter.amount.$lte = Number(amountMax) }
  if (dateFrom || dateTo) { filter.deliveryDate = {}; if (dateFrom) filter.deliveryDate.$gte = new Date(dateFrom); if (dateTo) filter.deliveryDate.$lte = new Date(dateTo) }
  if (status) filter.status = status

  const sort = {}
  const sBy = sortBy || 'createdAt'
  const sOrd = sortOrder === 'asc' ? 1 : -1
  if (['amount', 'buyerName', 'deliveryDate', 'createdAt', 'updatedAt'].includes(sBy)) sort[sBy] = sOrd
  else sort.createdAt = -1

  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))

  return { filter, sort, page: pageNum, limit: limitNum, skip: (pageNum - 1) * limitNum }
}

function paginatedResponse(docs, total, page, limit) {
  return { data: docs, total, page, limit, totalPages: Math.ceil(total / limit) }
}

const STRING_FIELDS = ['buyerName', 'invoiceNumber', 'buyerAddress', 'workDescription', 'agreementRef', 'msmeAddressOverride', 'declarationText']
const NUMERIC_FIELDS = ['amount', 'agreedTermsDays', 'gstAmount']
const DATE_FIELDS = ['deliveryDate', 'invoiceDate']
const BOOL_FIELDS = ['gstIncluded']

const ALLOWED_FIELDS = [...STRING_FIELDS, ...NUMERIC_FIELDS, ...DATE_FIELDS, ...BOOL_FIELDS]

function validateInvoice(body, isPatch) {
  const errors = {}
  const picked = {}

  if (isPatch && Object.keys(body).length === 0) {
    errors._general = 'Request body is empty'
    return { errors, picked: null }
  }

  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.includes(key)) {
      errors[key] = `Unknown field: "${key}"`
    }
  }

  if (!isPatch) {
    if (body.buyerName === undefined || String(body.buyerName).trim() === '') errors.buyerName = 'Buyer name is required'
    if (body.amount === undefined) errors.amount = 'Amount is required'
    if (body.deliveryDate === undefined) errors.deliveryDate = 'Delivery date is required'
  }

  for (const key of STRING_FIELDS) {
    if (body[key] === undefined) continue
    if (typeof body[key] !== 'string') { errors[key] = `${key} must be a string`; continue }
    if (body[key].length > 500) errors[key] = `${key} must be 500 characters or fewer`
    else picked[key] = body[key].trim()
  }

  for (const key of NUMERIC_FIELDS) {
    if (body[key] === undefined) continue
    const val = Number(body[key])
    if (isNaN(val)) { errors[key] = `${key} must be a number`; continue }
    if (key === 'amount' && val <= 0) { errors[key] = 'Amount must be a positive number'; continue }
    if (key === 'agreedTermsDays') {
      if (val < 1 || val > 365) { errors[key] = 'Payment terms must be between 1 and 365 days'; continue }
      picked[key] = val
      continue
    }
    if (key === 'gstAmount' && val < 0) { errors[key] = 'GST amount cannot be negative'; continue }
    picked[key] = val
  }

  for (const key of DATE_FIELDS) {
    if (body[key] === undefined) continue
    const d = new Date(body[key])
    if (isNaN(d.getTime())) { errors[key] = `${key} must be a valid date`; continue }
    picked[key] = d
  }

  for (const key of BOOL_FIELDS) {
    if (body[key] === undefined) continue
    if (typeof body[key] !== 'boolean') { errors[key] = `${key} must be true or false`; continue }
    picked[key] = body[key]
  }

  if (Object.keys(errors).length > 0) return { errors, picked: null }
  return { errors: null, picked }
}

router.get('/', wrapAsync(async (req, res) => {
  const { filter, sort, skip, limit } = buildQuery({ msmeId: req.msmeId }, req.query)
  const [data, total] = await Promise.all([
    Invoice.find(filter).sort(sort).skip(skip).limit(limit),
    Invoice.countDocuments(filter),
  ])
  res.json(paginatedResponse(data, total, skip / (limit || 1) + 1, limit))
}))

router.get('/overdue', wrapAsync(async (req, res) => {
  try {
    const now = new Date()
    const { buyer, amountMin, amountMax, dateFrom, dateTo, daysOverdueMin, daysOverdueMax, sortBy, sortOrder, page, limit } = req.query
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))

    const baseFilter = { msmeId: req.msmeId, status: 'outstanding' }
    if (buyer) baseFilter.buyerName = { $regex: buyer, $options: 'i' }
    if (amountMin || amountMax) { baseFilter.amount = {}; if (amountMin) baseFilter.amount.$gte = Number(amountMin); if (amountMax) baseFilter.amount.$lte = Number(amountMax) }

    const all = await Invoice.find(baseFilter).lean()
    const config = await SystemConfig.getConfig()
    const bankRate = config.rbiBankRate
    const rateHistory = config.rateHistory || []
    let overdue = all.filter(inv => {
      const due = new Date(inv.deliveryDate)
      due.setDate(due.getDate() + inv.agreedTermsDays)
      return due < now
    })

    if (dateFrom) overdue = overdue.filter(inv => new Date(inv.deliveryDate) >= new Date(dateFrom))
    if (dateTo) overdue = overdue.filter(inv => new Date(inv.deliveryDate) <= new Date(dateTo))
    if (daysOverdueMin) { const m = Number(daysOverdueMin); overdue = overdue.filter(inv => { const due = new Date(inv.deliveryDate); due.setDate(due.getDate() + inv.agreedTermsDays); return Math.floor((now - due) / 86400000) >= m }) }
    if (daysOverdueMax) { const m = Number(daysOverdueMax); overdue = overdue.filter(inv => { const due = new Date(inv.deliveryDate); due.setDate(due.getDate() + inv.agreedTermsDays); return Math.floor((now - due) / 86400000) <= m }) }

    overdue = overdue.map(inv => {
      const { totalInterest } = calculateInterest(inv.amount, inv.deliveryDate, inv.agreedTermsDays, now, bankRate, rateHistory)
      return { ...inv, interestAccrued: totalInterest }
    })

    const sBy = sortBy || 'deliveryDate'
    const sOrd = sortOrder === 'asc' ? 1 : -1
    overdue.sort((a, b) => {
      const dueA = new Date(a.deliveryDate); dueA.setDate(dueA.getDate() + a.agreedTermsDays)
      const dueB = new Date(b.deliveryDate); dueB.setDate(dueB.getDate() + b.agreedTermsDays)
      if (sBy === 'amount') return (a.amount - b.amount) * sOrd
      if (sBy === 'buyerName') return a.buyerName.localeCompare(b.buyerName) * sOrd
      if (sBy === 'deliveryDate' || sBy === 'dueDate') return (dueA - dueB) * sOrd
      if (sBy === 'daysOverdue') return ((now - dueA) - (now - dueB)) * sOrd
      return (dueA - dueB) * sOrd
    })

    const total = overdue.length
    const paged = overdue.slice((pageNum - 1) * limitNum, pageNum * limitNum)
    res.json(paginatedResponse(paged, total, pageNum, limitNum))
  } catch(err) {
    console.error('[overdue route]', err.message, err.stack?.split('\n')[1])
    throw err
  }
}))

router.get('/outstanding', wrapAsync(async (req, res) => {
  const q = { ...req.query, status: 'outstanding' }
  const { filter, sort, skip, limit } = buildQuery({ msmeId: req.msmeId, status: 'outstanding' }, q)
  const [data, total] = await Promise.all([
    Invoice.find(filter).sort(sort).skip(skip).limit(limit),
    Invoice.countDocuments(filter),
  ])
  res.json(paginatedResponse(data, total, skip / (limit || 1) + 1, limit))
}))

router.get('/transactions', async (req, res) => {
  const q = { ...req.query, status: 'paid' }
  const { filter, sort, skip, limit } = buildQuery({ msmeId: req.msmeId, status: 'paid' }, q)
  const [data, total, bankRate, rateHistory] = await Promise.all([
    Invoice.find(filter).sort(sort).skip(skip).limit(limit),
    Invoice.countDocuments(filter),
    getRbiBankRate(),
    getRateHistory(),
  ])
  const enriched = data.map(inv => {
    const due = new Date(inv.deliveryDate)
    due.setDate(due.getDate() + inv.agreedTermsDays)
    const paidAt = new Date(inv.updatedAt)
    const { totalInterest, breakdown } = calculateInterest(
      inv.amount, inv.deliveryDate, inv.agreedTermsDays, paidAt, bankRate, rateHistory
    )
    return { ...inv.toJSON(), daysLate: breakdown?.daysOverdue || 0, interestPaid: totalInterest }
  })
  res.json(paginatedResponse(enriched, total, skip / (limit || 1) + 1, limit))
})

router.get('/interest', async (req, res) => {
  const now = new Date()
  const { buyer, amountMin, amountMax, dateFrom, dateTo, daysOverdueMin, daysOverdueMax, interestMin, interestMax, sortBy, sortOrder, status, page, limit } = req.query
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))

  const baseFilter = { msmeId: req.msmeId }
  if (buyer) baseFilter.buyerName = { $regex: buyer, $options: 'i' }
  if (amountMin || amountMax) { baseFilter.amount = {}; if (amountMin) baseFilter.amount.$gte = Number(amountMin); if (amountMax) baseFilter.amount.$lte = Number(amountMax) }
  if (status) baseFilter.status = status

  const all = await Invoice.find(baseFilter).lean()
  const [bankRate, rateHistory] = await Promise.all([getRbiBankRate(), getRateHistory()])
  let withInterest = all.filter(inv => {
    if (inv.status === 'paid') return false
    const due = new Date(inv.deliveryDate)
    due.setDate(due.getDate() + inv.agreedTermsDays)
    return due < now
  })

  if (dateFrom) withInterest = withInterest.filter(inv => new Date(inv.deliveryDate) >= new Date(dateFrom))
  if (dateTo) withInterest = withInterest.filter(inv => new Date(inv.deliveryDate) <= new Date(dateTo))
  if (daysOverdueMin) { const m = Number(daysOverdueMin); withInterest = withInterest.filter(inv => { const due = new Date(inv.deliveryDate); due.setDate(due.getDate() + inv.agreedTermsDays); return Math.floor((now - due) / 86400000) >= m }) }
  if (daysOverdueMax) { const m = Number(daysOverdueMax); withInterest = withInterest.filter(inv => { const due = new Date(inv.deliveryDate); due.setDate(due.getDate() + inv.agreedTermsDays); return Math.floor((now - due) / 86400000) <= m }) }
  if (interestMin) withInterest = withInterest.filter(inv => (inv.interestAccrued || 0) >= Number(interestMin))
  if (interestMax) withInterest = withInterest.filter(inv => (inv.interestAccrued || 0) <= Number(interestMax))

  withInterest = withInterest.map(inv => {
    const { totalInterest } = calculateInterest(inv.amount, inv.deliveryDate, inv.agreedTermsDays, now, bankRate, rateHistory)
    return { ...inv, interestAccrued: totalInterest }
  })

  const sBy = sortBy || 'deliveryDate'
  const sOrd = sortOrder === 'asc' ? 1 : -1
  withInterest.sort((a, b) => {
    const intA = a.interestAccrued || 0
    const intB = b.interestAccrued || 0
    if (sBy === 'interest') return (intA - intB) * sOrd
    if (sBy === 'amount') return (a.amount - b.amount) * sOrd
    if (sBy === 'buyerName') return a.buyerName.localeCompare(b.buyerName) * sOrd
    return (new Date(a.deliveryDate) - new Date(b.deliveryDate)) * sOrd
  })

  const total = withInterest.length
  const paged = withInterest.slice((pageNum - 1) * limitNum, pageNum * limitNum)
  res.json(paginatedResponse(paged, total, pageNum, limitNum))
})

router.get('/stats', async (req, res) => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const [all, paidThisMonth, monthlyInvoices, bankRate, rateHistory] = await Promise.all([
    Invoice.find({ msmeId: req.msmeId }).lean(),
    Invoice.find({ msmeId: req.msmeId, status: 'paid', updatedAt: { $gte: startOfMonth } }).lean(),
    Invoice.aggregate([
      { $match: { msmeId: req.msmeId, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 }, paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    getRbiBankRate(),
    getRateHistory(),
  ])

  const outstanding = all.filter(i => i.status === 'outstanding')
  const overdue = outstanding.filter(i => {
    const due = new Date(i.deliveryDate)
    due.setDate(due.getDate() + i.agreedTermsDays)
    return due < now
  })

  const totalOutstanding = outstanding.reduce((s, i) => s + i.amount, 0)
  const totalOverdue = overdue.reduce((s, i) => s + i.amount, 0)
  const totalInterest = overdue.reduce((s, i) => {
    const { totalInterest } = calculateInterest(i.amount, i.deliveryDate, i.agreedTermsDays, now, bankRate, rateHistory)
    return s + totalInterest
  }, 0)
  const resolvedThisMonth = paidThisMonth.reduce((s, i) => s + i.amount, 0)

  const labels = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.toLocaleString('default', { month: 'short' })
    const year = d.getFullYear()
    labels.push({ month: `${month} ${year}`, key: `${d.getMonth()+1}-${d.getFullYear()}` })
  }

  const monthlyData = labels.map(({ month, key }) => {
    const [m, y] = key.split('-')
    const found = monthlyInvoices.find(g => g._id.month === Number(m) && g._id.year === Number(y))
    return { month, invoices: found ? found.count : 0, paid: found ? found.paid : 0 }
  })

  res.json({ totalOutstanding, totalOverdue, totalInterest, resolvedThisMonth, overdueCount: overdue.length, outstandingCount: outstanding.length, monthlyData })
})

router.post('/', wrapAsync(async (req, res) => {
  try {
    const { errors, picked } = validateInvoice(req.body, false)
    if (errors) {
      return res.status(400).json({ error: 'Validation failed', fields: errors })
    }
    const invoice = await Invoice.create({ ...picked, msmeId: req.msmeId })
    createNotification(req.msmeId, 'Invoice Created',
      `${invoice.buyerName} — ${invoice.invoiceNumber || 'No ref'} (₹${invoice.amount.toLocaleString('en-IN')}) logged.`,
      'info', invoice._id).catch(() => {})
    res.status(201).json(invoice)
  } catch (err) {
    console.error('[POST /invoices]', err.message)
    res.status(500).json({ error: err.message })
  }
}))

router.get('/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
  if (!invoice) return res.status(404).json({ error: 'not found' })
  if (invoice.msmeId !== req.msmeId) return res.status(404).json({ error: 'not found' })
  res.json(invoice)
})

router.get('/:id/timeline', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
  if (!invoice) return res.status(404).json({ error: 'not found' })
  if (invoice.msmeId !== req.msmeId) return res.status(404).json({ error: 'not found' })

  const now = new Date()
  const overdueDays = invoice.status === 'paid' ? 0 : daysOverdue(invoice.deliveryDate, invoice.agreedTermsDays, now)
  const stage = invoice.status === 'paid' ? -1 : stageForDays(overdueDays)
  res.json({
    invoiceId: invoice._id,
    status: invoice.status,
    escalationStage: stage,
    escalationLabel: stage === -1 ? 'Resolved' : STAGES[stage],
    overdueDays,
    overdueSince: (() => { const d = new Date(invoice.deliveryDate); d.setDate(d.getDate() + invoice.agreedTermsDays); return invoice.status === 'outstanding' ? d : null })(),
    reminderSentAt: invoice.lastOverdueNotifiedAt,
    noticeSentAt: invoice.overdueNoticeSentAt,
    resolutionDate: invoice.resolutionDate,
  })
})

router.get('/:id/notice', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
  if (!invoice) return res.status(404).json({ error: 'not found' })
  if (invoice.msmeId !== req.msmeId) return res.status(404).json({ error: 'not found' })

  const user = await User.findOne({ firebaseUid: req.msmeId })
  const pdf = await generateNoticePDF(invoice, user || {})

  // ponytail: generates on-demand every time — caching not needed for low-volume SMB app
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="notice-${invoice.invoiceNumber || invoice._id}.pdf"`,
    'Content-Length': pdf.length,
  })
  res.send(pdf)
})

router.get('/:id/breakdown', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
  if (!invoice) return res.status(404).json({ error: 'not found' })
  if (invoice.msmeId !== req.msmeId) return res.status(404).json({ error: 'not found' })

  const [bankRate, rateHistory] = await Promise.all([getRbiBankRate(), getRateHistory()])
  const { totalInterest, breakdown } = calculateInterest(
    invoice.amount, invoice.deliveryDate, invoice.agreedTermsDays, new Date(), bankRate, rateHistory
  )
  res.json({
    invoiceNumber: invoice.invoiceNumber,
    buyerName: invoice.buyerName,
    amount: invoice.amount,
    status: invoice.status,
    totalInterest,
    breakdown
  })
})

router.patch('/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
  if (!invoice) return res.status(404).json({ error: 'not found' })
  if (invoice.msmeId !== req.msmeId) return res.status(404).json({ error: 'not found' })

  const { errors, picked } = validateInvoice(req.body, true)
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', fields: errors })
  }
  if (!picked || Object.keys(picked).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  const updated = await Invoice.findByIdAndUpdate(req.params.id, { ...picked, ...(picked.status === 'paid' && invoice.status !== 'paid' ? { resolutionDate: new Date() } : {}) }, { new: true })
  if (picked.status === 'paid' && invoice.status !== 'paid') {
    createNotification(req.msmeId, 'Invoice Paid',
      `${updated.buyerName} — ${updated.invoiceNumber || 'No ref'} (₹${updated.amount.toLocaleString('en-IN')}) marked as paid.`,
      'success', updated._id)
  } else if (Object.keys(picked).length) {
    // ponytail: only notifies on non-status updates, skips if only status toggled unpaid
    createNotification(req.msmeId, 'Invoice Updated',
      `${updated.buyerName} — ${updated.invoiceNumber || 'No ref'} updated.`,
      'info', updated._id)
  }
  res.json(updated)
})

router.delete('/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
  if (!invoice) return res.status(404).json({ error: 'not found' })
  if (invoice.msmeId !== req.msmeId) return res.status(404).json({ error: 'not found' })
  await Invoice.findByIdAndDelete(req.params.id)
  createNotification(req.msmeId, 'Invoice Deleted', `${invoice.buyerName} — ${invoice.invoiceNumber || 'No ref'} (₹${invoice.amount.toLocaleString('en-IN')}) has been deleted.`, 'info')
  res.json({ ok: true })
})

export default router
