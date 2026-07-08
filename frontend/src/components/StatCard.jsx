export default function StatCard({ label, value, sub, icon, color }) {
  const colors = {
    navy: 'from-slate-800 to-slate-700 text-slate-900',
    teal: 'from-teal-600 to-teal-500 text-slate-900',
    red: 'from-red-500 to-red-400 text-slate-900',
    amber: 'from-amber-500 to-amber-400 text-slate-900',
    emerald: 'from-emerald-500 to-emerald-400 text-slate-900',
    white: 'bg-white text-slate-900',
  }

  const cardClass = colors[color] || colors.white

  return (
    <div className={`rounded-xl shadow-sm border border-slate-200 p-5 bg-white ${color ? 'shadow-md' : ''}`}>
      <div className={`rounded-lg p-3 ${cardClass}`}>
        <div className="flex items-center justify-between">
          <p className={`text-xs font-medium uppercase tracking-wider ${color ? 'text-slate-900/70' : 'text-slate-500'}`}>{label}</p>
          {icon && <span className={color ? 'text-slate-900/60' : 'text-slate-400'}>{icon}</span>}
        </div>
        <p className={`text-2xl font-bold mt-1 ${color ? 'text-slate-900' : 'text-slate-900'}`}>{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${color ? 'text-slate-900/60' : 'text-slate-500'}`}>{sub}</p>}
      </div>
    </div>
  )
}
