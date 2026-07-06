import { useEffect, useState } from 'react'
import { api } from '../api'
import ListFilter from '../components/ListFilter'
import StatusBadge from '../components/StatusBadge'

const config = {
  sortOptions: { buyerName: 'Buyer', amount: 'Amount', interest: 'Interest', deliveryDate: 'Due Date' },
  filters: { buyer: true, amount: true, dateRange: true, status: true },
  statusOptions: [['outstanding', 'Outstanding'], ['paid', 'Paid']],
}

async function fetchData(pg, filters) {
  const params = new URLSearchParams({ page: pg || 1, limit: '20' })
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  if (filters.buyer) params.set('buyer', filters.buyer)
  if (filters.amountMin) params.set('amountMin', filters.amountMin)
  if (filters.amountMax) params.set('amountMax', filters.amountMax)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.status) params.set('status', filters.status)
  try { return await api.get(`/invoices/interest?${params}`) }
  catch { return { data: [], total: 0, page: 1, totalPages: 1 } }
}

function formatIndian(n) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

function formatIndianNoDecimal(n) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function Interest({ nav }) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(true)
  const [breakdown, setBreakdown] = useState(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const now = Date.now()

  useEffect(() => {
    setLoading(true)
    fetchData(1, {}).then(res => {
      setData(res.data); setTotal(res.total); setPage(res.page); setPages(res.totalPages)
      setLoading(false)
    })
  }, [])

  async function load(pg, f) {
    setLoading(true)
    const res = await fetchData(pg, f)
    setData(res.data); setTotal(res.total); setPage(res.page); setPages(res.totalPages)
    setLoading(false)
  }

  function handleFilterChange(newFilters) {
    setFilters(newFilters); load(1, newFilters)
  }

  async function showBreakdown(invId) {
    setBreakdownLoading(true)
    setBreakdown(null)
    try {
      const res = await api.get(`/invoices/${invId}/breakdown`)
      setBreakdown(res)
    } catch {
      setBreakdown({ error: true })
    }
    setBreakdownLoading(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Interest Accrued</h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} invoice{total !== 1 ? 's' : ''} with accrued interest under Section 16, MSMED Act</p>
      </div>

      <ListFilter config={config} filters={filters} onChange={handleFilterChange} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">No invoices with interest accrued</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Invoice</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Buyer</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Due Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Days Overdue</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Interest Accrued</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(inv => {
                    const dueDate = new Date(inv.deliveryDate)
                    dueDate.setDate(dueDate.getDate() + inv.agreedTermsDays)
                    const daysOverdue = Math.ceil((now - dueDate) / 86400000)
                    return (
                      <tr key={inv._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900 cursor-pointer" onClick={() => nav('invoiceDetail', inv._id)}>{inv.invoiceNumber}</td>
                        <td className="px-5 py-3.5 text-slate-600">{inv.buyerName}</td>
                        <td className="px-5 py-3.5 text-right font-medium text-slate-900">₹{formatIndianNoDecimal(inv.amount)}</td>
                        <td className="px-5 py-3.5 text-slate-600">{dueDate.toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-3.5 text-red-600 font-medium">{daysOverdue}d</td>
                        <td className="px-5 py-3.5 text-right font-medium text-amber-600">₹{formatIndian(inv.interestAccrued || 0)}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={inv.status} overdue={true} /></td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => showBreakdown(inv._id)}
                            className="text-xs text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap"
                          >
                            View breakdown
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">Page {page} of {pages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => load(page - 1, filters)} className="px-3 py-1 text-xs border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
                  <button disabled={page >= pages} onClick={() => load(page + 1, filters)} className="px-3 py-1 text-xs border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {breakdown && !breakdown.error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setBreakdown(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Interest Breakdown</h3>
                <button onClick={() => setBreakdown(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{breakdown.invoiceNumber} — {breakdown.buyerName}</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Principal</span>
                  <span className="font-medium text-slate-900">₹{formatIndian(breakdown.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Overdue since</span>
                  <span className="font-medium text-slate-900">{breakdown.breakdown.daysOverdue} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Applicable rate</span>
                  <span className="font-medium text-slate-900">3 × RBI Bank Rate ({breakdown.breakdown.bankRateUsed}%) = {breakdown.breakdown.annualApplicableRate}% p.a.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Monthly compounding rate</span>
                  <span className="font-medium text-slate-900">{breakdown.breakdown.monthlyRatePercent}% per month</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Full months elapsed</span>
                    <span className="font-medium text-slate-900">{breakdown.breakdown.fullMonths}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Remaining days</span>
                    <span className="font-medium text-slate-900">{breakdown.breakdown.remainingDays}</span>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Compounded principal</span>
                    <span className="font-medium text-slate-900">₹{formatIndian(breakdown.breakdown.compoundedPrincipal)}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center bg-amber-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Interest accrued so far</p>
                  <p className="text-xs text-amber-500 mt-0.5">Compounded monthly per Section 16, MSMED Act 2006</p>
                </div>
                <p className="text-xl font-bold text-amber-600">₹{formatIndian(breakdown.totalInterest)}</p>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setBreakdown(null)} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {breakdownLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading breakdown...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
