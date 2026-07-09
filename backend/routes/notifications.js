const { Router } = require('express')
const Notification = require('../models/Notification.js')

const router = Router()

function wrapAsync(fn) {
  return (req, res, next) => fn(req, res, next).catch(next)
}

router.get('/', wrapAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100)
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ msmeId: req.msmeId }).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ msmeId: req.msmeId, isRead: false }),
  ])
  res.json({ notifications, unreadCount })
}))

router.patch('/read-all', wrapAsync(async (req, res) => {
  await Notification.updateMany({ msmeId: req.msmeId, isRead: false }, { $set: { isRead: true } })
  res.json({ ok: true })
}))

router.patch('/:id/read', wrapAsync(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, msmeId: req.msmeId })
  if (!n) return res.status(404).json({ error: 'not found' })
  n.isRead = true
  await n.save()
  res.json({ ok: true })
}))

module.exports = router
