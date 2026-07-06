import { useEffect, useState } from 'react'
import { api } from '../api'
import { InvoiceIcon, AddIcon, AlertIcon } from '../components/Icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function Dashboard({ nav }) {
  const [stats, setStats] = useState(null)

  useEffect(() => { api.get('/invoices/stats').then(setStats).catch(() => {}) }, [])

  const cards = [
    { label: 'Outstanding', value: stats ? `₹${stats.totalOutstanding.toLocaleString()}` : '—', sub: stats ? `${stats.outstandingCount} unpaid invoices` : '', color: 'text-slate-900', icon: <InvoiceIcon />, iconBg: 'text-slate-400' },
    { label: 'Overdue', value: stats ? `${stats.overdueCount}` : '—', sub: stats ? `₹${stats.totalOverdue.toLocaleString()} at risk` : '', color: 'text-red-600', icon: <AlertIcon />, iconBg: 'text-red-400' },
    { label: 'Interest Accrued', value: stats ? `₹${stats.totalInterest.toFixed(0)}` : '—', sub: 'Under Section 16, MSMED Act', color: 'text-amber-600', icon: <AlertIcon />, iconBg: 'text-amber-400' },
    { label: 'Paid This Month', value: stats ? `₹${stats.resolvedThisMonth.toLocaleString()}` : '—', sub: 'resolved this month', color: 'text-emerald-600', icon: <InvoiceIcon />, iconBg: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of your invoice ledger</p>
        </div>
        <button
          onClick={() => nav('addInvoice')}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <AddIcon />
          New Invoice
        </button>
      </div>

      {!stats ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading stats...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {cards.map(c => (
              <div key={c.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{c.label}</p>
                  <span className={c.iconBg}>{c.icon}</span>
                </div>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          {stats.overdueCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <AlertIcon />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    {stats.overdueCount} invoice{stats.overdueCount > 1 ? 's' : ''} overdue
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Total interest of ₹{stats.totalInterest.toFixed(0)} has accrued.
                  </p>
                </div>
                <button onClick={() => nav('overdue')} className="text-xs text-red-700 hover:text-red-800 font-medium underline">View all</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'All Invoices', desc: 'View & manage all invoices', page: 'invoices', color: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100' },
              { label: 'Overdue', desc: 'Past-due invoices', page: 'overdue', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
              { label: 'Outstanding', desc: 'Unpaid bills', page: 'outstanding', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
              { label: 'Transactions', desc: 'Payment history', page: 'transactions', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
            ].map(link => (
              <button key={link.page} onClick={() => nav(link.page)}
                className={`text-left p-4 rounded-xl border ${link.color} transition-colors`}>
                <p className="text-sm font-semibold">{link.label}</p>
                <p className="text-xs mt-0.5 opacity-75">{link.desc}</p>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Monthly Invoice Volume</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="invoices" stroke="#0d9488" strokeWidth={2} dot={{ r: 3, fill: '#0d9488' }} name="Total Invoices" />
                <Line type="monotone" dataKey="paid" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} name="Paid" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
