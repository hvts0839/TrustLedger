const admin = require('firebase-admin')

let ready = false
const fcm = admin.default || admin
if (!fcm.apps?.length && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    fcm.initializeApp({
      credential: fcm.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
      }),
    })
    ready = true
  } catch (err) {
    console.error('[FCM] Init failed:', err.message)
  }
}

module.exports = { admin }

module.exports.sendPushToTokens = async function sendPushToTokens(tokens, title, body, data = {}) {
  if (!tokens?.length || !ready) return []
  try {
    const response = await fcm.messaging().sendEachForMulticast({
      notification: { title, body },
      data,
      tokens,
    })
    const invalid = tokens.filter((_, i) => !response.responses[i]?.success)
    return invalid
  } catch (err) {
    console.error('[FCM]', err.message)
    return []
  }
}
