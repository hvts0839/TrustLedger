export default function Landing({ onNavigate }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-sm font-bold text-white">TL</div>
            <span className="text-sm font-bold text-slate-900">TrustLedger</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('login')}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-24 flex items-center gap-16">
          <div className="flex-1">
            <p className="text-teal-400 text-sm font-medium uppercase tracking-wider mb-4">
              MSMED Act 2006 &mdash; Sections 15 &amp; 16
            </p>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Get paid on time, using the law that already protects you
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-8">
              Indian MSMEs have a legal right to payment within 45 days with penal interest. TrustLedger makes it usable &mdash; no lawyers, no paperwork, no confrontation.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('register')}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-teal-600/20"
              >
                Start Tracking Free
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="text-slate-300 hover:text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors border border-slate-600 hover:border-slate-500"
              >
                Sign In
              </button>
            </div>
          </div>
          <div className="flex-1 hidden lg:block">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
              <div className="space-y-4">
                {[
                  { label: 'Invoice Amount', value: '₹2,50,000' },
                  { label: 'Legal Due Date', value: '15 Aug 2026', highlight: false },
                  { label: 'Days Overdue', value: '42', highlight: true },
                  { label: 'Interest Owed (Sec 16)', value: '₹5,671', highlight: true },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                    <span className="text-sm text-slate-400">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.highlight ? 'text-amber-400' : 'text-white'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Interest accrues daily at 3x RBI repo rate
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">The law is on your side. We just make it practical.</h2>
            <p className="text-slate-500 leading-relaxed">
              Every year, crores of rupees owed to MSMEs are delayed or defaulted on. The MSMED Act gives you powerful rights &mdash; but most small businesses never use them because the process feels intimidating or adversarial. TrustLedger changes that.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                title: 'The Problem',
                items: [
                  'Buyers routinely pay 60-120 days late',
                  'MSMEs fear losing business by complaining',
                  'Legal action is costly and slow',
                  'Interest is never calculated or claimed',
                ],
                color: 'red',
              },
              {
                title: 'The Law (MSMED Act)',
                items: [
                  'Payment must be made within 45 days',
                  '3x RBI repo rate penal interest applies',
                  'Interest compounds from day one of default',
                  'Facilitation Council for dispute resolution',
                ],
                color: 'amber',
              },
              {
                title: 'How TrustLedger Helps',
                items: [
                  'Auto-calculates due dates & interest',
                  'Sends neutral, system-generated reminders',
                  'No confrontation with your buyer',
                  'Builds buyer reliability data over time',
                ],
                color: 'teal',
              },
            ].map((col, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
                  col.color === 'red' ? 'text-red-600' : col.color === 'amber' ? 'text-amber-600' : 'text-teal-600'
                }`}>{col.title}</h3>
                <ul className="space-y-3">
                  {col.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        col.color === 'red' ? 'bg-red-400' : col.color === 'amber' ? 'bg-amber-400' : 'bg-teal-400'
                      }`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">Everything you need to protect your payments</h2>
          <div className="grid grid-cols-4 gap-6">
            {[
              {
                title: 'Auto Due-Date Tracking',
                desc: 'Enter your invoice once. We calculate the legal due date under Section 15 automatically.',
              },
              {
                title: 'Live Interest Calculator',
                desc: 'See exactly how much interest is owed under Section 16, updated daily.',
              },
              {
                title: 'Neutral Reminders',
                desc: 'System-generated notices you can forward to buyers. No personal confrontation.',
              },
              {
                title: 'Buyer Reliability Data',
                desc: 'Check a buyer\'s payment track record before accepting a new order.',
              },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center mb-4">
                  <span className="text-teal-600 font-bold text-sm">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Start protecting your payments today</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            No legal knowledge needed. No paperwork. Just enter your invoices and let TrustLedger do the rest.
          </p>
          <button
            onClick={() => onNavigate('register')}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-teal-600/20"
          >
            Create Free Account
          </button>
          <p className="text-xs text-slate-500 mt-4">Powered by the MSMED Act, 2006</p>
        </div>
      </section>

      <footer className="bg-slate-900 border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-5 h-5 rounded bg-teal-500 flex items-center justify-center text-[10px] font-bold text-white">TL</span>
            TrustLedger &mdash; Invoice Ledger for Indian MSMEs
          </div>
          <p className="text-xs text-slate-600">&copy; 2026 TrustLedger</p>
        </div>
      </footer>
    </div>
  )
}
