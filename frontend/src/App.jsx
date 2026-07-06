import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { api } from './api'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import Overdue from './pages/Overdue'
import Outstanding from './pages/Outstanding'
import Transactions from './pages/Transactions'
import Interest from './pages/Interest'
import AddInvoice from './pages/AddInvoice'
import InvoiceDetail from './pages/InvoiceDetail'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Landing from './pages/Landing'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Sidebar from './components/Sidebar'
import PinEntry from './components/PinEntry'
import PinSetup from './components/PinSetup'
import ForgotPin from './components/ForgotPin'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [selectedId, setSelectedId] = useState(null)
  const [profileComplete, setProfileComplete] = useState(false)
  const [userName, setUserName] = useState('')
  const [loginMode, setLoginMode] = useState('login')
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [pinVerified, setPinVerified] = useState(false)
  const [needsPinSetup, setNeedsPinSetup] = useState(false)
  const [checkingPin, setCheckingPin] = useState(false)
  const [forgotPinMode, setForgotPinMode] = useState(false)
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)
      if (u) {
        try {
          // Ensure user record exists in MongoDB
          let data
          try {
            data = await api.get('/users/me')
          } catch {
            // First login — create record
            data = await api.post('/users/me', {
              email: u.email || '',
              authProvider: u.providerData?.some(p => p.providerId === 'google.com') ? 'google' : 'email',
            })
          }

          const isGoogleUser = u.providerData?.some(p => p.providerId === 'google.com')
          const isVerified = isGoogleUser || data.emailVerified

          if (!isVerified) {
            setNeedsEmailVerification(true)
            return
          }

          setNeedsEmailVerification(false)
          setProfileComplete(!!data.profileComplete)
          setUserName(data.name || '')
          if (!data.profileComplete) {
            setPage('profile')
          } else if (!data.pinHash) {
            setNeedsPinSetup(true)
          } else {
            setCheckingPin(true)
          }
        } catch {
          setPage('profile')
        }
      }
    })
  }, [])

  const nav = useCallback((p, id) => {
    if (needsEmailVerification) return
    if (!profileComplete && p !== 'profile') return
    if (!pinVerified && p !== 'profile') return
    setPage(p)
    if (id) setSelectedId(id)
  }, [needsEmailVerification, profileComplete, pinVerified])

  const handleProfileComplete = useCallback(() => {
    setProfileComplete(true)
    api.get('/users/me').then(data => {
      if (!data.pinHash) {
        setNeedsPinSetup(true)
      } else {
        setCheckingPin(true)
      }
    }).catch(() => {})
  }, [])

  const handleEmailVerified = useCallback(() => {
    setNeedsEmailVerification(false)
    api.get('/users/me').then(data => {
      setProfileComplete(!!data.profileComplete)
      setUserName(data.name || '')
      if (!data.profileComplete) {
        setPage('profile')
      } else if (!data.pinHash) {
        setNeedsPinSetup(true)
      } else {
        setCheckingPin(true)
      }
    }).catch(() => {
      setPage('profile')
    })
  }, [])

  const handlePinSetupComplete = useCallback(() => {
    setNeedsPinSetup(false)
    setPinVerified(true)
    setPage('dashboard')
  }, [])

  const handlePinVerified = useCallback(() => {
    setPinVerified(true)
    setCheckingPin(false)
    setPage('dashboard')
  }, [])

  function handleLandingNav(target) {
    if (target === 'register') {
      setShowRegister(true)
      setShowLogin(false)
    } else {
      setLoginMode('login')
      setShowLogin(true)
      setShowRegister(false)
    }
  }

  const urlMode = new URLSearchParams(window.location.search).get('mode')
  if (urlMode === 'resetPassword') return <ResetPassword />

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user && !showLogin && !showRegister) return <Landing onNavigate={handleLandingNav} />
  if (!user && showRegister) return (
    <Register
      onBack={() => setShowRegister(false)}
      onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true) }}
    />
  )
  if (!user) return <Login initialMode={loginMode} onBack={() => setShowLogin(false)} onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true) }} />
  if (needsEmailVerification) return <VerifyEmail onVerified={handleEmailVerified} />
  if (!profileComplete) {
    return (
      <div className="min-h-screen bg-[#F4F5F7]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Profile isNewUser onComplete={handleProfileComplete} />
        </div>
      </div>
    )
  }
  if (needsPinSetup) return <PinSetup onComplete={handlePinSetupComplete} />
  if (forgotPinMode) return <ForgotPin onBack={() => setForgotPinMode(false)} onComplete={() => { setForgotPinMode(false); setCheckingPin(true) }} />
  if (checkingPin) return <PinEntry onSuccess={handlePinVerified} onForgot={() => setForgotPinMode(true)} />

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <Sidebar page={page} nav={nav} userName={userName} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {page === 'profile' && <Profile nav={nav} onComplete={handleProfileComplete} />}
          {page === 'settings' && <Settings nav={nav} />}
          {page === 'dashboard' && <Dashboard nav={nav} />}
          {page === 'invoices' && <Invoices nav={nav} />}
          {page === 'overdue' && <Overdue nav={nav} />}
          {page === 'outstanding' && <Outstanding nav={nav} />}
          {page === 'transactions' && <Transactions nav={nav} />}
          {page === 'interest' && <Interest nav={nav} />}
          {page === 'addInvoice' && <AddInvoice nav={nav} />}
          {page === 'invoiceDetail' && <InvoiceDetail id={selectedId} nav={nav} />}
        </div>
      </main>
    </div>
  )
}
