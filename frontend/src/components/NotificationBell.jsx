import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { BellIcon } from './Icons'

const TYPE_BG = { success: 'bg-emerald-500', warning: 'bg-amber-500', error: 'bg-red-500', info: 'bg-blue-500' }

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ notifications: [], unreadCount: 0 })
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    api.get('/notifications?limit=10').then(setData).catch(() => {})
  }, [open])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markAllRead() {
    await api.patch('/notifications/read-all', {})
    setData({ notifications: data.notifications.map(n => ({ ...n, isRead: true })), unreadCount: 0 })
  }

  async function markRead(id) {
    await api.patch(`/notifications/${id}/read`, {})
    setData(prev => ({
      notifications: prev.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }))
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-slate-300 hover:text-white transition-colors"
      >
        <BellIcon />
        {data.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {data.unreadCount > 9 ? '9+' : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {data.unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {data.notifications.length === 0 ? (
              <p className="text-sm text-slate-400 px-4 py-6 text-center">Nothing yet</p>
            ) : data.notifications.map(n => (
              <div
                key={n._id}
                onClick={() => { if (!n.isRead) markRead(n._id) }}
                className={`px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors ${n.isRead ? 'bg-white' : 'bg-blue-50/40 hover:bg-blue-50/70'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TYPE_BG[n.type] || TYPE_BG.info}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-tight ${n.isRead ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
