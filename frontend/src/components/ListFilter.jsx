export default function ListFilter({ config, filters, onChange }) {
  function set(key, value) {
    onChange({ ...filters, [key]: value || '' })
  }

  function clear() {
    const cleared = {}
    for (const key of Object.keys(config.sortOptions || {})) cleared[key] = ''
    for (const key of Object.keys(config.filters || {})) cleared[key] = ''
    onChange(cleared)
  }

  const hasFilters = Object.entries(config.filters || {}).some(([key]) => filters[key])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {config.sortOptions && (
            <select
              value={filters.sortBy || ''}
              onChange={e => set('sortBy', e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">Sort by</option>
              {Object.entries(config.sortOptions).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          )}

          {filters.sortBy && (
            <button
              onClick={() => set('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 border border-slate-300 rounded-lg"
            >
              {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          )}

          {config.filters?.buyer && (
            <input
              placeholder="Buyer name"
              value={filters.buyer || ''}
              onChange={e => set('buyer', e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          )}

          {config.filters?.amount && (
            <>
              <input
                type="number"
                placeholder="Min ₹"
                value={filters.amountMin || ''}
                onChange={e => set('amountMin', e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="number"
                placeholder="Max ₹"
                value={filters.amountMax || ''}
                onChange={e => set('amountMax', e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </>
          )}

          {config.filters?.dateRange && (
            <>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={e => set('dateFrom', e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                title="From date"
              />
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={e => set('dateTo', e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                title="To date"
              />
            </>
          )}

          {config.filters?.status && (
            <select
              value={filters.status || ''}
              onChange={e => set('status', e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">All status</option>
              {config.statusOptions?.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          )}

          {config.filters?.daysOverdueRange && (
            <>
              <input
                type="number"
                placeholder="Min days"
                value={filters.daysOverdueMin || ''}
                onChange={e => set('daysOverdueMin', e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="number"
                placeholder="Max days"
                value={filters.daysOverdueMax || ''}
                onChange={e => set('daysOverdueMax', e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </>
          )}

          {config.filters?.interestRange && (
            <>
              <input
                type="number"
                placeholder="Min interest"
                value={filters.interestMin || ''}
                onChange={e => set('interestMin', e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="number"
                placeholder="Max interest"
                value={filters.interestMax || ''}
                onChange={e => set('interestMax', e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasFilters && (
            <button onClick={clear} className="text-xs text-slate-400 hover:text-slate-600">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
