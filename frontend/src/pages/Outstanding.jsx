import { useEffect, useState } from 'react'
import { api } from '../api'
import ListFilter from '../components/ListFilter'
import StatusBadge from '../components/StatusBadge'

const config = {
  sortOptions: { buyerName: 'Buyer', amount: 'Amount', deliveryDate: 'Date', createdAt: 'Created' },
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
  try { return await api.get(`/invoices/outstanding?${params}`) }
  catch { return { data: [], total: 0, page: 1, totalPages: 1 } }
}

export default function Outstanding({ nav }) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(true)
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Outstanding Bills</h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} unpaid invoice{total !== 1 ? 's' : ''}</p>
      </div>

      <ListFilter config={config} filters={filters} onChange={handleFilterChange} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">No outstanding bills</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Invoice</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Buyer</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Delivery Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Due Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Days Left</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(inv => {
                    const dueDate = new Date(inv.deliveryDate)
                    dueDate.setDate(dueDate.getDate() + inv.agreedTermsDays)
                    const overdue = dueDate < now
                    const diffDays = Math.ceil((dueDate - now) / 86400000)
                    const dueSoon = !overdue && diffDays <= 7
                    return (
                      <tr key={inv._id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => nav('invoiceDetail', inv._id)}>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{inv.invoiceNumber}</td>
                        <td className="px-5 py-3.5"><button onClick={e => { e.stopPropagation(); nav('buyerDetail', inv.buyerId) }} className="text-teal-600 hover:text-teal-700 font-medium">{inv.buyerName}</button></td>
                        <td className="px-5 py-3.5 text-right font-medium text-slate-900">₹{inv.amount.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-slate-600">{new Date(inv.deliveryDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-3.5 text-slate-600">{dueDate.toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-3.5">
                          {overdue ? <span className="text-red-600 font-medium">{Math.abs(diffDays)}d overdue</span> : <span className="text-slate-600">{diffDays}d</span>}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={inv.status} overdue={overdue} dueSoon={dueSoon} /></td>
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
    </div>
  )
}
