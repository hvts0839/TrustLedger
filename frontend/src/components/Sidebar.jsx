import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { HomeIcon, InvoiceIcon, AddIcon, SettingsIcon, UserIcon, LogoutIcon } from './Icons'
import { useState } from 'react'

const mainItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
  { id: 'invoices', label: 'All Invoices', icon: <InvoiceIcon /> },
  { id: 'addInvoice', label: 'New Invoice', icon: <AddIcon /> },
]

const listItems = [
  { id: 'overdue', label: 'Overdue', color: 'text-red-400' },
  { id: 'outstanding', label: 'Outstanding', color: 'text-amber-400' },
  { id: 'transactions', label: 'Transactions', color: 'text-emerald-400' },
]

function getFirstName(fullName) {
  if (!fullName) return null
  return fullName.split(' ')[0]
}

export default function Sidebar({ page, nav, userName }) {
  const firstName = getFirstName(userName)
  const [listsOpen, setListsOpen] = useState(true)

  return (
    <aside className="w-[264px] bg-slate-900 text-white flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-sm font-bold text-white shrink-0">TL</div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate">
              {firstName ? `Hi, ${firstName}` : 'Hi there'}
            </h1>
            <p className="text-[10px] text-slate-400 leading-tight truncate">Invoice Ledger</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {mainItems.map((item) => (
          <button
            key={item.id}
            onClick={() => nav(item.id)}
            className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              page === item.id
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:pl-5'
            }`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="pt-3 pb-1">
          <button
            onClick={() => setListsOpen(!listsOpen)}
            className="flex items-center gap-1.5 px-4 py-1 text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300 w-full"
          >
            <span className={`transition-transform ${listsOpen ? 'rotate-90' : ''}`}>▶</span>
            Lists
          </button>
        </div>

        {listsOpen && listItems.map((item) => (
          <button
            key={item.id}
            onClick={() => nav(item.id)}
            className={`w-full flex items-center justify-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              page === item.id
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:pl-5'
            }`}
          >
            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${item.color} bg-current`} />
            <span>{item.label}</span>
          </button>
        ))}

        <button
          key="interest"
          onClick={() => nav('interest')}
          className={`w-full flex items-center justify-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            page === 'interest'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:pl-5'
          }`}
        >
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 bg-current" />
          <span>Interest Acquired</span>
        </button>

        <button
          key="settings"
          onClick={() => nav('settings')}
          className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            page === 'settings'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:pl-5'
          }`}
        >
          <span className="shrink-0"><SettingsIcon /></span>
          <span>Settings</span>
        </button>
      </nav>

      <div className="px-4 py-3 border-t border-slate-700 space-y-1">
        <button
          onClick={() => nav('profile')}
          className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            page === 'profile'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:pl-5'
          }`}
        >
          <span className="shrink-0"><UserIcon /></span>
          <span>My Profile</span>
        </button>
        <button
          onClick={() => signOut(auth)}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-slate-400 hover:bg-slate-800 hover:text-white hover:pl-5"
        >
          <span className="shrink-0"><LogoutIcon /></span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
