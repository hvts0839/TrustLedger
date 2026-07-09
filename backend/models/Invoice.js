const mongoose = require('mongoose')
const { calculateInterestSync } = require('../services/interest.js')

const invoiceSchema = new mongoose.Schema({
  msmeId: { type: String, required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', default: null },
  buyerName: { type: String, required: true },
  invoiceNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  deliveryDate: { type: Date, required: true },
  agreedTermsDays: { type: Number, default: 45 },
  status: { type: String, enum: ['outstanding', 'paid'], default: 'outstanding' },
  escalationStage: { type: Number, default: 0 },
  lastOverdueNotifiedAt: { type: Date },
  overdueNoticeSentAt: { type: Date },
  resolutionDate: { type: Date },
  buyerAddress: { type: String, default: '' },
  invoiceDate: { type: Date },
  workDescription: { type: String, default: '' },
  gstIncluded: { type: Boolean, default: false },
  gstAmount: { type: Number, default: 0 },
  agreementRef: { type: String, default: '' },
  msmeAddressOverride: { type: String, default: '' },
  declarationText: { type: String, default: '' }
}, { timestamps: true })

invoiceSchema.virtual('legalDueDate').get(function () {
  const d = new Date(this.deliveryDate)
  d.setDate(d.getDate() + this.agreedTermsDays)
  return d
})

invoiceSchema.virtual('interestAccrued').get(function () {
  if (this.status === 'paid') return 0
  const rate = process.env.RBI_RATE ? Number(process.env.RBI_RATE) : 8.25
  const { totalInterest } = calculateInterestSync(
    this.amount, this.deliveryDate, this.agreedTermsDays, new Date(), rate
  )
  return totalInterest
})

invoiceSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Invoice', invoiceSchema)
