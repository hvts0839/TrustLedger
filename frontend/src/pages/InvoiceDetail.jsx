import { useEffect, useState } from 'react'
import { api } from '../api'
import StatusBadge from '../components/StatusBadge'
import { BackIcon, CheckIcon, AlertIcon, CalendarIcon } from '../components/Icons'

export default function InvoiceDetail({ id, nav }) {
  const [inv, setInv] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [marking, setMarking] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    api.get(`/invoices/${id}`).then(setInv).catch(() => nav('dashboard'))
    api.get(`/invoices/${id}/timeline`).then(setTimeline).catch(() => {})
  }, [id, nav])

  async function downloadNotice() {
    setGenerating(true)
    try {
      const blob = await api.getBlob(`/invoices/${id}/notice`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `notice-${inv?.invoiceNumber || id}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setGenerating(false)
  }

  if (!inv) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  const now = Date.now()
  const dueDate = new Date(inv.legalDueDate)
  const overdue = inv.status === 'outstanding' && dueDate < now
  const diffDays = Math.ceil((dueDate - now) / 86400000)
  const dueSoon = inv.status === 'outstanding' && diffDays > 0 && diffDays <= 7

  async function markPaid() {
    setMarking(true)
    try {
      await api.patch(`/invoices/${id}`, { status: 'paid' })
      nav('dashboard')
    } catch {
      setMarking(false)
    }
  }

  async function deleteInvoice() {
    if (!confirm('Delete this invoice?')) return
    await api.delete(`/invoices/${id}`)
    nav('dashboard')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('dashboard')} className="text-slate-400 hover:text-slate-600 transition-colors">
          <BackIcon />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{inv.invoiceNumber}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{inv.buyerName}</p>
        </div>
        <StatusBadge status={inv.status} overdue={overdue} dueSoon={dueSoon} />
      </div>

      {overdue && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <AlertIcon />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold">₹{inv.interestAccrued?.toFixed(2)} interest accrued</p>
              <p className="text-sm text-white/80 mt-1">
                This invoice is {Math.abs(diffDays)} days overdue. Under Section 16 of the MSMED Act, 2006, compound interest is accumulating daily at 3x the RBI repo rate.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
                <CalendarIcon />
                Due was {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      )}

      {timeline && timeline.status === 'outstanding' && timeline.escalationStage >= 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Escalation Status</p>
          <p className="text-sm font-medium text-slate-900">
            Current stage: {timeline.escalationLabel} &mdash; Day {timeline.overdueDays}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {timeline.reminderSentAt ? `Reminder sent: ${new Date(timeline.reminderSentAt).toLocaleDateString('en-IN')}` : 'Reminder not yet sent'}
            {timeline.noticeSentAt ? ` · Notice sent: ${new Date(timeline.noticeSentAt).toLocaleDateString('en-IN')}` : ''}
            {timeline.resolutionDate ? ` · Escalated: ${new Date(timeline.resolutionDate).toLocaleDateString('en-IN')}` : ''}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Invoice Details</h2>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Invoice Number</p>
            <p className="font-medium text-slate-900 mt-0.5">{inv.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Buyer</p>
            <p className="font-medium text-slate-900 mt-0.5">{inv.buyerName}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Amount</p>
            <p className="font-medium text-slate-900 mt-0.5 text-lg">₹{inv.amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Payment Terms</p>
            <p className="font-medium text-slate-900 mt-0.5">{inv.agreedTermsDays} days</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Delivery Date</p>
            <p className="font-medium text-slate-900 mt-0.5">{new Date(inv.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Legal Due Date</p>
            <p className={`font-medium mt-0.5 ${overdue ? 'text-red-600' : 'text-slate-900'}`}>
              {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {overdue && (
            <>
              <div>
                <p className="text-slate-500 text-xs">Days Overdue</p>
                <p className="font-medium text-red-600 mt-0.5">{Math.abs(diffDays)} days</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Interest Rate</p>
                <p className="font-medium text-slate-900 mt-0.5">3x RBI Repo Rate</p>
              </div>
            </>
          )}
          {inv.buyerAddress && (
            <div className="col-span-2">
              <p className="text-slate-500 text-xs">Buyer Address</p>
              <p className="font-medium text-slate-900 mt-0.5">{inv.buyerAddress}</p>
            </div>
          )}
          {inv.invoiceDate && (
            <div>
              <p className="text-slate-500 text-xs">Invoice Date</p>
              <p className="font-medium text-slate-900 mt-0.5">{new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}
          {inv.workDescription && (
            <div className="col-span-2">
              <p className="text-slate-500 text-xs">Work Description</p>
              <p className="font-medium text-slate-900 mt-0.5">{inv.workDescription}</p>
            </div>
          )}
          {inv.agreementRef && (
            <div>
              <p className="text-slate-500 text-xs">Agreement / PO Ref</p>
              <p className="font-medium text-slate-900 mt-0.5">{inv.agreementRef}</p>
            </div>
          )}
          {inv.gstIncluded && (
            <div>
              <p className="text-slate-500 text-xs">GST Included</p>
              <p className="font-medium text-slate-900 mt-0.5">Yes</p>
            </div>
          )}
          {inv.gstAmount > 0 && (
            <div>
              <p className="text-slate-500 text-xs">GST Amount</p>
              <p className="font-medium text-slate-900 mt-0.5">₹{inv.gstAmount.toLocaleString()}</p>
            </div>
          )}
          {inv.msmeAddressOverride && (
            <div className="col-span-2">
              <p className="text-slate-500 text-xs">MSME Address</p>
              <p className="font-medium text-slate-900 mt-0.5">{inv.msmeAddressOverride}</p>
            </div>
          )}
        </div>

        {overdue && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">Interest Accrued (Section 16)</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">₹{inv.interestAccrued?.toFixed(2)}</p>
                <p className="text-xs text-amber-500 mt-0.5">Updates daily &bull; Compound interest</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-amber-700">Per day</p>
                <p className="text-lg font-bold text-amber-600">
                  ₹{((inv.interestAccrued || 0) / Math.max(Math.abs(diffDays), 1)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {inv.declarationText && (
        <div className="mt-6 border border-amber-200 bg-amber-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Declaration</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">{inv.declarationText}</p>
        </div>
      )}

      {inv.status === 'outstanding' && (
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={markPaid}
            disabled={marking}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <CheckIcon />
            {marking ? 'Marking...' : 'Mark as Paid'}
          </button>
          <button
            onClick={deleteInvoice}
            className="text-slate-400 hover:text-red-600 px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Delete
          </button>
          {timeline?.escalationStage >= 2 && (
            <button
              onClick={downloadNotice}
              disabled={generating}
              className="ml-auto flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {generating ? 'Generating...' : 'Generate Notice'}
            </button>
          )}
        </div>
      )}

      {inv.status === 'paid' && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckIcon />
          </div>
          <p className="text-sm text-emerald-800 font-medium">This invoice has been paid</p>
        </div>
      )}
    </div>
  )
}
