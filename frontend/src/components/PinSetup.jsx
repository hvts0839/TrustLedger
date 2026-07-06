import { useState, useRef, useEffect } from 'react'
import { api } from '../api'

export default function PinSetup({ onComplete, onSkip }) {
  const [step, setStep] = useState('create')
  const [digits, setDigits] = useState(['', '', '', ''])
  const [confirmDigits, setConfirmDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputs = useRef([])
  const confirmInputs = useRef([])

  useEffect(() => { inputs.current[0]?.focus() }, [])

  function handleChange(idx, val, arr, setter, ref, nextOnComplete) {
    if (val && !/^\d$/.test(val)) return
    const next = [...arr]
    next[idx] = val
    setter(next)
    setError('')
    if (val && idx < 3) ref.current[idx + 1]?.focus()
    if (val && idx === 3 && nextOnComplete) nextOnComplete(next.join(''))
  }

  function handleKeyDown(idx, e, arr, ref) {
    if (e.key === 'Backspace' && !arr[idx] && idx > 0) {
      ref.current[idx - 1]?.focus()
    }
  }

  function onFirstComplete(pin) {
    setDigits(pin.split(''))
    setStep('confirm')
    setTimeout(() => confirmInputs.current[0]?.focus(), 100)
  }

  async function onConfirmComplete(pin) {
    const first = digits.join('')
    if (pin !== first) {
      setError('PINs do not match. Try again.')
      setStep('create')
      setDigits(['', '', '', ''])
      setConfirmDigits(['', '', '', ''])
      setTimeout(() => inputs.current[0]?.focus(), 100)
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/users/pin/set', { pin })
      onComplete()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-80">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-sm font-bold text-white mx-auto mb-3">TL</div>
          <h1 className="text-lg font-semibold text-slate-900">
            {step === 'create' ? 'Set Your PIN' : 'Confirm Your PIN'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'create' ? 'Choose a 4-digit security code' : 'Enter the same PIN again'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-center">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-center gap-3 mb-6">
          {(step === 'create' ? digits : confirmDigits).map((d, i) => {
            const ref = step === 'create' ? inputs : confirmInputs
            const setter = step === 'create' ? setDigits : setConfirmDigits
            const arr = step === 'create' ? digits : confirmDigits
            const onComplete = step === 'create' ? onFirstComplete : onConfirmComplete
            return (
              <input
                key={i}
                ref={(el) => { ref.current[i] = el }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value, arr, setter, ref, onComplete)}
                onKeyDown={(e) => handleKeyDown(i, e, arr, ref)}
                disabled={loading}
                className="w-12 h-14 text-center text-xl font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              />
            )
          })}
        </div>

        {onSkip && step === 'create' && (
          <button
            onClick={onSkip}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
