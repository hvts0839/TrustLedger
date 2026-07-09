const mongoose = require('mongoose')

const systemConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'default' },
  rbiBankRate: { type: Number, default: 8.25 },
  lastUpdated: { type: Date, default: Date.now },
  rbiRateChangeFlagged: { type: Boolean, default: false },
  rbiRatePreviousValue: { type: Number, default: null },
  rbiRateLastChecked: { type: Date },
  rateHistory: [{ _id: false, year: Number, month: Number, rate: Number }],
}, { timestamps: true })

systemConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({ key: 'default' })
  if (!config) {
    config = await this.create({ key: 'default' })
  }
  return config
}

systemConfigSchema.statics.updateBankRate = async function (newRate) {
  const config = await this.getConfig()
  config.rbiBankRate = newRate
  config.lastUpdated = new Date()
  await config.save()
  return config
}

module.exports = mongoose.model('SystemConfig', systemConfigSchema)
