const mongoose = require('mongoose')

const buyerSchema = new mongoose.Schema({
  msmeId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  gstin: { type: String, default: '' }
}, { timestamps: true })

module.exports = mongoose.model('Buyer', buyerSchema)
