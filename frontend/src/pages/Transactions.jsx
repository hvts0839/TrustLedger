import { useEffect, useState } from 'react'
import { api } from '../api'
import ListFilter from '../components/ListFilter'

const config = {
  sortOptions: { buyerName: 'Buyer', amount: 'Amount', updatedAt: 'Paid Date' },
  filters: { buyer: true, amount: true, dateRange: true },
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
  try { return await api.get(`/invoices/transactions?${params}`) }
  catch { return { data: [], total: 0, page: 1, totalPages: 1 } }
}

export default function Transactions({ nav }) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Transaction History</h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} resolved invoice{total !== 1 ? 's' : ''}</p>
      </div>

      <ListFilter config={config} filters={filters} onChange={handleFilterChange} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">No transactions yet</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Invoice</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Buyer</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Paid On</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Days Late</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Interest Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(inv => (
                    <tr key={inv._id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => nav('invoiceDetail', inv._id)}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3.5 text-slate-600">{inv.buyerName}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-900">₹{inv.amount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-slate-600">{new Date(inv.updatedAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-3.5">{inv.daysLate > 0 ? <span className="text-amber-600 font-medium">{inv.daysLate}d</span> : <span className="text-emerald-600">On time</span>}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-900">{inv.interestPaid > 0 ? `₹${inv.interestPaid.toFixed(0)}` : <span className="text-slate-300">&mdash;</span>}</td>
                    </tr>
                  ))}
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
    </div>
  )
}
