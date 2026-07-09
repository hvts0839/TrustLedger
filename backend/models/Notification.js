const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  msmeId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'success', 'error'], default: 'info' },
  isRead: { type: Boolean, default: false },
  relatedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null }
}, { timestamps: true })

module.exports = mongoose.model('Notification', notificationSchema)
