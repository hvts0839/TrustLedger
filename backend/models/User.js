import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  companyName: { type: String, default: '' },
  udyamNumber: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  profileComplete: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  pinHash: { type: String, default: '' },
  pinAttempts: { type: Number, default: 0 },
  pinLockedUntil: { type: Date, default: null },
  passwordAttempts: { type: Number, default: 0 },
  passwordLockedUntil: { type: Date, default: null },
  emailReminders: { type: Boolean, default: true },
  // ponytail: unused until buyer-reliability aggregation across multiple MSMEs is built
// currently reliability scores are per-MSME only, not cross-MSME aggregated, so no anonymization is needed yet
dataSharing: { type: Boolean, default: false },
  knownDevices: [{ type: String }],
  lastLoginAt: { type: Date, default: null },
  fcmTokens: [{ type: String }]
}, { timestamps: true })

export default mongoose.model('User', userSchema)
