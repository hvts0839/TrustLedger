import { Router } from 'express'
import Buyer from '../models/Buyer.js'
import Invoice from '../models/Invoice.js'
import { createNotification } from '../services/notify.js'
import { calculateBuyerScore } from '../services/reliability.js'
import auth from '../middleware/auth.js'

const router = Router()

router.use(auth)

router.get('/', async (req, res) => {
  const q = req.query.q?.slice(0, 50)
  const filter = { msmeId: req.msmeId }
  if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
  const buyers = await Buyer.find(filter).sort({ name: 1 }).limit(50)
  res.json(buyers)
})

router.post('/', async (req, res) => {
  const { name, email, phone, address, gstin } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' })
  const buyer = await Buyer.create({
    msmeId: req.msmeId, name: name.trim(), email: email || '', phone: phone || '',
    address: address || '', gstin: gstin || ''
  })
  createNotification(req.msmeId, 'Buyer Added', `${buyer.name} has been added to your buyers.`, 'info')
  res.status(201).json(buyer)
})

router.patch('/:id', async (req, res) => {
  const buyer = await Buyer.findOne({ _id: req.params.id, msmeId: req.msmeId })
  if (!buyer) return res.status(404).json({ error: 'not found' })
  for (const key of ['name', 'email', 'phone', 'address', 'gstin']) {
    if (req.body[key] !== undefined) buyer[key] = req.body[key]
  }
  await buyer.save()
  createNotification(req.msmeId, 'Buyer Updated', `${buyer.name}'s details have been updated.`, 'info')
  res.json(buyer)
})

router.get('/:id/reliability', async (req, res) => {
  const buyer = await Buyer.findOne({ _id: req.params.id, msmeId: req.msmeId })
  if (!buyer) return res.status(404).json({ error: 'not found' })
  const reliability = await calculateBuyerScore(req.msmeId, buyer._id)
  res.json({ buyerId: buyer._id, buyerName: buyer.name, ...reliability })
})

router.get('/:id/invoices', async (req, res) => {
  const buyer = await Buyer.findOne({ _id: req.params.id, msmeId: req.msmeId })
  if (!buyer) return res.status(404).json({ error: 'not found' })
  const invoices = await Invoice.find({ msmeId: req.msmeId, buyerId: buyer._id }).sort({ createdAt: -1 }).limit(50)
  res.json(invoices)
})

router.delete('/:id', async (req, res) => {
  const buyer = await Buyer.findOne({ _id: req.params.id, msmeId: req.msmeId })
  if (!buyer) return res.status(404).json({ error: 'not found' })
  const name = buyer.name
  await Buyer.deleteOne({ _id: buyer._id })
  createNotification(req.msmeId, 'Buyer Deleted', `${name} has been removed.`, 'info')
  res.json({ ok: true })
})

export default router
