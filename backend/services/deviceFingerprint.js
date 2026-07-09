const crypto = require('crypto')

function fingerprint(req) {
  const ua = req.headers['user-agent'] || ''
  const ip = req.ip
  const raw = `${ua}::${ip}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function buildDeviceInfo(req) {
  const ua = req.headers['user-agent'] || 'Unknown'
  const ip = req.ip
  return `Browser/Device: ${ua.slice(0, 120)}\nIP Address: ${ip || 'Unknown'}\nTime: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`
}

module.exports = { fingerprint, buildDeviceInfo }
