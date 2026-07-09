import { useEffect, useState } from 'react'
import { api } from '../api'
import { BackIcon } from '../components/Icons'

// ponytail: no visual score gauge — just text. upgrade to a chart component if needed later
export default function BuyerDetail({ id, nav }) {
  const [buyer, setBuyer] = useState(null)
  const [reliability, setReliability] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.get(`/buyers`).then(buyers => buyers.find(b => b._id === id)).catch(() => null),
      api.get(`/buyers/${id}/reliability`).catch(() => null),
      api.get(`/buyers/${id}/invoices`).catch(() => []),
    ]).then(([b, r, invs]) => {
      setBuyer(b)
      setReliability(r)
      setInvoices(invs)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (!buyer) return <div className="text-center py-12 text-slate-500">Buyer not found</div>

  const scoreColor = reliability?.score != null
    ? reliability.score >= 70 ? 'text-emerald-600' : reliability.score >= 40 ? 'text-amber-600' : 'text-red-600'
    : 'text-slate-300'

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('outstanding')} className="text-slate-400 hover:text-slate-600 transition-colors">
          <BackIcon />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{buyer.name}</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Buyer Profile</h2>
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          {buyer.email && <div><p className="text-slate-500 text-xs">Email</p><p className="font-medium text-slate-900 mt-0.5">{buyer.email}</p></div>}
          {buyer.phone && <div><p className="text-slate-500 text-xs">Phone</p><p className="font-medium text-slate-900 mt-0.5">{buyer.phone}</p></div>}
          {buyer.address && <div className="col-span-2"><p className="text-slate-500 text-xs">Address</p><p className="font-medium text-slate-900 mt-0.5">{buyer.address}</p></div>}
          {buyer.gstin && <div><p className="text-slate-500 text-xs">GSTIN</p><p className="font-medium text-slate-900 mt-0.5">{buyer.gstin}</p></div>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Reliability Score</h2>
        {reliability?.score != null ? (
          <div>
            <p className={`text-4xl font-bold ${scoreColor}`}>{reliability.score}/100</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Avg Days Late</p>
                <p className="font-medium text-slate-900 mt-0.5">{reliability.avgDaysLate} days</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Overdue Rate</p>
                <p className="font-medium text-slate-900 mt-0.5">{reliability.overdueRate}%</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 text-xs">Invoices Reviewed</p>
                <p className="font-medium text-slate-900 mt-0.5">{reliability.totalInvoices}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">Score based on {reliability.totalInvoices} invoice(s) — 70% on-time rate, 30% severity weight.</p>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No due invoices yet to calculate a score.</p>
        )}
      </div>

      {invoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Invoices ({invoices.length})</h2>
          <div className="space-y-2">
            {invoices.map(inv => (
              <div key={inv._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">{inv.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">₹{inv.amount.toLocaleString('en-IN')} &middot; {new Date(inv.deliveryDate).toLocaleDateString('en-IN')}</p>
                </div>
                <button onClick={() => nav('invoiceDetail', inv._id)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">View</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}