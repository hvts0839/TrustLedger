import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { sendPushToTokens } from './fcm.js'

export async function createNotification(msmeId, title, message, type = 'info', relatedInvoiceId = null) {
  try {
    await Notification.create({ msmeId, title, message, type, relatedInvoiceId })
    const user = await User.findOne({ firebaseUid: msmeId }).select('fcmTokens').lean()
    if (user?.fcmTokens?.length) {
      const data = relatedInvoiceId ? { route: 'invoice', id: String(relatedInvoiceId) } : {}
      const invalid = await sendPushToTokens(user.fcmTokens, title, message, data)
      if (invalid.length) {
        await User.updateOne(
          { firebaseUid: msmeId },
          { $pull: { fcmTokens: { $in: invalid } } }
        )
      }
    }
  } catch (err) {
    console.error('[NOTIFY]', err.message)
  }
}
