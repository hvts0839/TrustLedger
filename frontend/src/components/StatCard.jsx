export default function StatCard({ label, value, sub, icon, color }) {
  const colors = {
    navy: 'from-slate-800 to-slate-700 text-white',
    teal: 'from-teal-600 to-teal-500 text-white',
    red: 'from-red-500 to-red-400 text-white',
    amber: 'from-amber-500 to-amber-400 text-white',
    emerald: 'from-emerald-500 to-emerald-400 text-white',
    white: 'bg-white text-slate-900',
  }

  const cardClass = colors[color] || colors.white

  return (
    <div className={`rounded-xl shadow-sm border border-slate-200 p-5 ${color ? 'shadow-md' : 'bg-white'}`}>
      <div className={`rounded-lg p-3 ${cardClass}`}>
        <div className="flex items-center justify-between">
          <p className={`text-xs font-medium uppercase tracking-wider ${color ? 'text-white/70' : 'text-slate-500'}`}>{label}</p>
          {icon && <span className={color ? 'text-white/60' : 'text-slate-400'}>{icon}</span>}
        </div>
        <p className={`text-2xl font-bold mt-1 ${color ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${color ? 'text-white/60' : 'text-slate-500'}`}>{sub}</p>}
      </div>
    </div>
  )
}
