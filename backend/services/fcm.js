import admin from 'firebase-admin'

let ready = false
// ponytail: single-project init — add multi-project support if ever needed
// ponytail: admin is default export — apps lives on admin.default or top-level
const fcm = admin.default || admin
if (!fcm.apps?.length && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    fcm.initializeApp({
      credential: fcm.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // ponytail: .env may have outer quotes and real newlines or escaped \n — handle both
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
      }),
    })
    ready = true
  } catch (err) {
    console.error('[FCM] Init failed:', err.message)
  }
}

export { admin }

export async function sendPushToTokens(tokens, title, body, data = {}) {
  if (!tokens?.length || !ready) return []
  try {
    const response = await fcm.messaging().sendEachForMulticast({
      notification: { title, body },
      data,
      tokens,
    })
    // ponytail: global cleanup — only works if all tokens belong to same user
    const invalid = tokens.filter((_, i) => !response.responses[i]?.success)
    return invalid
  } catch (err) {
    console.error('[FCM]', err.message)
    return []
  }
}
