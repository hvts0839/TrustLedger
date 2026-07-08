import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { BackIcon, CalendarIcon, RupeeIcon } from '../components/Icons'

const STORAGE_KEY = 'trustledger_invoice_mode'

const DEFAULT_DECLARATION =
  'I/We hereby declare that the aforementioned particulars are true and correct to the best of my/our knowledge and belief. This invoice is being raised in accordance with the provisions of the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006.'

export default function AddInvoice({ nav }) {
  const [fullMode, setFullMode] = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'full')
  const [form, setForm] = useState({
    buyerName: '', invoiceNumber: '', amount: '', deliveryDate: '', agreedTermsDays: 45,
    buyerAddress: '', invoiceDate: '', workDescription: '', gstIncluded: false,
    gstAmount: '', agreementRef: '', msmeAddressOverride: '',
    declarationText: DEFAULT_DECLARATION, declarationAcknowledged: false
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [buyerQuery, setBuyerQuery] = useState('')
  const [buyers, setBuyers] = useState([])
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false)
  const [selectedBuyerId, setSelectedBuyerId] = useState(null)
  const buyerRef = useRef(null)
  const buyerSearchRef = useRef(null)

  useEffect(() => {
    if (!buyerQuery.trim()) { setBuyers([]); return }
    const t = setTimeout(async () => {
      try {
        const data = await api.get(`/buyers?q=${encodeURIComponent(buyerQuery)}`)
        setBuyers(data)
        setShowBuyerDropdown(data.length > 0)
      } catch { setBuyers([]) }
    }, 200)
    return () => clearTimeout(t)
  }, [buyerQuery])

  useEffect(() => {
    function handleClick(e) {
      if (buyerRef.current && !buyerRef.current.contains(e.target)) setShowBuyerDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectBuyer(b) {
    setForm(f => ({ ...f, buyerName: b.name, buyerAddress: b.address || f.buyerAddress }))
    setSelectedBuyerId(b._id)
    setShowBuyerDropdown(false)
    setBuyerQuery(b.name)
  }

  async function saveAsNewBuyer() {
    if (!form.buyerName.trim()) return
    try {
      const b = await api.post('/buyers', { name: form.buyerName, address: form.buyerAddress })
      setSelectedBuyerId(b._id)
      setBuyerQuery(form.buyerName)
    } catch { /* silent */ }
  }

  function toggleMode(full) {
    setFullMode(full)
    sessionStorage.setItem(STORAGE_KEY, full ? 'full' : 'quick')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (fullMode && !form.declarationAcknowledged) {
      setError('Please acknowledge the declaration before saving')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const body = {
        buyerName: form.buyerName,
        invoiceNumber: form.invoiceNumber,
        amount: Number(form.amount),
        deliveryDate: form.deliveryDate,
        agreedTermsDays: Number(form.agreedTermsDays),
        buyerId: selectedBuyerId || undefined,
      }
      if (fullMode) {
        body.buyerAddress = form.buyerAddress
        body.invoiceDate = form.invoiceDate || undefined
        body.workDescription = form.workDescription
        body.gstIncluded = form.gstIncluded
        body.gstAmount = form.gstAmount ? Number(form.gstAmount) : 0
        body.agreementRef = form.agreementRef
        body.msmeAddressOverride = form.msmeAddressOverride
        body.declarationText = form.declarationText
      }
      await api.post('/invoices', body)
      nav('dashboard')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [field]: val })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav('dashboard')} className="text-slate-400 hover:text-slate-600 transition-colors">
          <BackIcon />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">New Invoice</h1>
          <p className="text-sm text-slate-500 mt-0.5">Log a purchase order or invoice</p>
        </div>
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => toggleMode(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!fullMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Quick
          </button>
          <button
            type="button"
            onClick={() => toggleMode(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${fullMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Full
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 relative" ref={buyerRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Buyer Name</label>
            <input
              ref={buyerSearchRef}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              placeholder="Search or type buyer name"
              value={buyerQuery}
              onChange={e => { setBuyerQuery(e.target.value); setForm(f => ({ ...f, buyerName: e.target.value })); setSelectedBuyerId(null) }}
              onFocus={() => buyers.length > 0 && setShowBuyerDropdown(true)}
              required
            />
            {selectedBuyerId && <span className="text-[10px] text-teal-600 mt-0.5 block">Linked to saved buyer</span>}
            {showBuyerDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                {buyers.map(b => (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() => selectBuyer(b)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
                  >
                    <span className="font-medium text-slate-800">{b.name}</span>
                    {b.gstin && <span className="text-xs text-slate-400 ml-2">GST: {b.gstin}</span>}
                  </button>
                ))}
                {buyerQuery.trim() && !buyers.some(b => b.name.toLowerCase() === buyerQuery.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={saveAsNewBuyer}
                    className="w-full text-left px-3 py-2 text-xs text-teal-600 hover:bg-teal-50 font-medium border-t border-slate-100"
                  >
                    + Save "{buyerQuery.trim()}" as new buyer
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice / PO Number</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              placeholder="e.g. INV-001"
              value={form.invoiceNumber}
              onChange={set('invoiceNumber')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><RupeeIcon /></span>
              <input
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                type="number"
                placeholder="0"
                min="0"
                value={form.amount}
                onChange={set('amount')}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="deliveryDate" className="block text-sm font-medium text-slate-700 mb-1">Delivery Date</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><CalendarIcon /></span>
              <input
                id="deliveryDate"
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                type="date"
                value={form.deliveryDate}
                onChange={set('deliveryDate')}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition bg-white"
              value={form.agreedTermsDays}
              onChange={set('agreedTermsDays')}
            >
              <option value="45">45 days (default, MSMED Act)</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="15">15 days</option>
              <option value="7">7 days</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Legal maximum is 45 days under the MSMED Act</p>
          </div>

          {fullMode && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><CalendarIcon /></span>
                  <input
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    type="date"
                    value={form.invoiceDate}
                    onChange={set('invoiceDate')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Buyer Address</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                  placeholder="Buyer's registered address"
                  value={form.buyerAddress}
                  onChange={set('buyerAddress')}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Work Description</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition resize-none"
                  rows={3}
                  placeholder="Describe the goods or services supplied"
                  value={form.workDescription}
                  onChange={set('workDescription')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agreement / PO Ref</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                  placeholder="e.g. PO-2026-042"
                  value={form.agreementRef}
                  onChange={set('agreementRef')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GST Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><RupeeIcon /></span>
                  <input
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    type="number"
                    placeholder="0"
                    min="0"
                    value={form.gstAmount}
                    onChange={set('gstAmount')}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  id="gstIncluded"
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  checked={form.gstIncluded}
                  onChange={set('gstIncluded')}
                />
                <label htmlFor="gstIncluded" className="text-sm text-slate-700">
                  GST included in the invoice amount
                </label>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  MSME Address <span className="text-slate-400 font-normal">(optional override)</span>
                </label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                  placeholder="Leave blank to use profile address"
                  value={form.msmeAddressOverride}
                  onChange={set('msmeAddressOverride')}
                />
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-600">
            <span className="font-medium">Legal due date:</span>{' '}
            {form.deliveryDate
              ? new Date(new Date(form.deliveryDate).getTime() + Number(form.agreedTermsDays) * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Set a delivery date to calculate'}
          </p>
        </div>

        {fullMode && (
          <div className="border border-amber-300 bg-amber-50 rounded-lg overflow-hidden">
            <div className="bg-amber-500 px-4 py-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-white text-xs font-semibold uppercase tracking-wider">Declaration Required</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-amber-900 leading-relaxed">
                {form.declarationText}
              </p>
              <textarea
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition resize-none"
                rows={3}
                value={form.declarationText}
                onChange={set('declarationText')}
                placeholder="Custom declaration text"
              />
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 mt-0.5"
                  checked={form.declarationAcknowledged}
                  onChange={set('declarationAcknowledged')}
                />
                <span className="text-xs text-amber-900 font-medium">
                  I acknowledge that the information provided is accurate and that this invoice is being raised under the MSMED Act, 2006. I understand that providing false information may have legal consequences.
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {submitting ? 'Saving...' : 'Save Invoice'}
          </button>
          <button
            type="button"
            onClick={() => nav('dashboard')}
            className="text-slate-500 hover:text-slate-700 px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
