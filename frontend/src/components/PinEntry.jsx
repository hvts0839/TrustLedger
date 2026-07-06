import { useState, useRef, useEffect } from 'react'
import { api } from '../api'

export default function PinEntry({ onSuccess, onForgot }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputs = useRef([])

  useEffect(() => { inputs.current[0]?.focus() }, [])

  function handleChange(idx, val) {
    if (val && !/^\d$/.test(val)) return
    const next = [...digits]
    next[idx] = val
    setDigits(next)
    setError('')
    if (val && idx < 3) inputs.current[idx + 1]?.focus()
    if (val && idx === 3) submitPin(next.join(''))
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  async function submitPin(pin) {
    setLoading(true)
    setError('')
    try {
      await api.post('/users/pin/verify', { pin })
      onSuccess()
    } catch (err) {
      setError(err.message)
      setDigits(['', '', '', ''])
      inputs.current[0]?.focus()
      setLoading(false)
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (text.length === 4) {
      const arr = text.split('')
      setDigits(arr)
      submitPin(text)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-80">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-sm font-bold text-white mx-auto mb-3">TL</div>
          <h1 className="text-lg font-semibold text-slate-900">Enter your PIN</h1>
          <p className="text-sm text-slate-500 mt-1">4-digit security code</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-center">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className={`w-12 h-14 text-center text-xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition ${
                error ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
            />
          ))}
        </div>

        {onForgot && (
          <button
            onClick={onForgot}
            className="w-full text-center text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
          >
            Forgot PIN?
          </button>
        )}
      </div>
    </div>
  )
}
