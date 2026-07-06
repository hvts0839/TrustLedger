import Notification from '../models/Notification.js'

export async function createNotification(msmeId, title, message, type = 'info', relatedInvoiceId = null) {
  try {
    await Notification.create({ msmeId, title, message, type, relatedInvoiceId })
  } catch (err) {
    console.error('[NOTIFY]', err.message)
  }
}
