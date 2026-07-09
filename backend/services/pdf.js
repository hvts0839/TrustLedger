import PDFDocument from 'pdfkit'
import { calculateInterestSync } from './interest.js'

// ponytail: single-function module — no template engine, no HTML-to-PDF, just raw pdfkit
export function generateNoticePDF(invoice, user) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))

  const rate = process.env.RBI_RATE ? Number(process.env.RBI_RATE) : 8.25
  const { totalInterest, daysOverdue } = calculateInterestSync(
    invoice.amount, invoice.deliveryDate, invoice.agreedTermsDays, new Date(), rate
  )
  const due = new Date(invoice.deliveryDate)
  due.setDate(due.getDate() + invoice.agreedTermsDays)

  // ── header ──
  doc.fontSize(18).font('Helvetica-Bold').text('FORMAL NOTICE OF OVERDUE PAYMENT', { align: 'center' })
  doc.moveDown(1.5)

  // ── section 1: reference ──
  doc.fontSize(11).font('Helvetica-Bold').text('Under Section 15 & 16 of the Micro, Small and Medium Enterprises Development Act, 2006')
  doc.moveDown(0.5)
  doc.font('Helvetica')
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  doc.text(`Notice No: ${invoice.invoiceNumber || 'N/A'}`)
  doc.moveDown(1)

  // ── section 2: buyer info ──
  doc.font('Helvetica-Bold').text('To,')
  doc.text(invoice.buyerName || 'Buyer')
  if (invoice.buyerAddress) doc.text(invoice.buyerAddress)
  doc.moveDown(1)

  // ── section 3: invoice details ──
  doc.font('Helvetica-Bold').text('Subject: Overdue Payment Reminder', { underline: true })
  doc.moveDown(0.5)
  doc.font('Helvetica')
  doc.text(`Invoice Number: ${invoice.invoiceNumber || 'N/A'}`)
  doc.text(`Invoice Amount: ₹${invoice.amount.toLocaleString('en-IN')}`)
  doc.text(`Delivery Date: ${new Date(invoice.deliveryDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  doc.text(`Agreed Payment Terms: ${invoice.agreedTermsDays} days`)
  doc.text(`Legal Due Date: ${due.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  doc.moveDown(0.5)

  // ── section 4: overdue status ──
  doc.font('Helvetica-Bold').text('Overdue Status')
  doc.moveDown(0.3)
  doc.font('Helvetica')
  doc.text(`Days Overdue: ${daysOverdue}`)
  doc.text(`Interest Accrued (as on date): ₹${totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
  doc.text(`Applicable Interest Rate: ${(rate * 3).toFixed(2)}% per annum (3× RBI bank rate of ${rate}%)`)
  doc.moveDown(1)

  // ── section 5: legal notice ──
  doc.font('Helvetica-Bold').text('Legal Notice')
  doc.moveDown(0.3)
  doc.font('Helvetica')
  doc.text(
    `You are hereby notified that the above-referenced invoice amount of ₹${invoice.amount.toLocaleString('en-IN')} ` +
    `along with accrued interest of ₹${totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ` +
    `(total ₹${(invoice.amount + totalInterest).toLocaleString('en-IN', { minimumFractionDigits: 2 })}) ` +
    `is due and payable immediately.`,
    { align: 'justify' }
  )
  doc.moveDown(0.5)
  doc.text(
    'Please arrange payment within 7 days from the date of this notice to avoid further escalation ' +
    'and potential legal proceedings under the MSMED Act, 2006.',
    { align: 'justify' }
  )
  doc.moveDown(1.5)

  // ── footer ──
  doc.fontSize(9).fillColor('#666')
  doc.text('This is a system-generated notice. No signature is required.', { align: 'center' })
  doc.text(`TrustLedger — ${user.companyName || user.name || 'Registered MSME'}`, { align: 'center' })

  doc.end()

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })
}