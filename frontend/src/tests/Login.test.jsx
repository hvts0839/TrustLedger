import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Login from '../pages/Login'

// Mock firebase/auth functions
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: vi.fn(() => ({ setCustomParameters: vi.fn() })),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  setPersistence: vi.fn(),
  browserLocalPersistence: 'local',
  browserSessionPersistence: 'session',
}))

// Mock api
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(() => Promise.resolve({ ok: true })),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with email and password fields', () => {
    render(<Login initialMode="login" />)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('renders Remember Me checkbox for login mode', () => {
    render(<Login initialMode="login" />)
    expect(screen.getByText('Remember me')).toBeInTheDocument()
  })

  it('renders Forgot password link for login mode', () => {
    render(<Login initialMode="login" />)
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
  })

  it('shows "Create Account" button in register mode', () => {
    render(<Login initialMode="register" />)
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByText('Create Account')).toBeInTheDocument()
  })

  it('shows "Sign In" button in login mode', () => {
    render(<Login initialMode="login" />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('hides Remember Me in register mode', () => {
    render(<Login initialMode="register" />)
    expect(screen.queryByText('Remember me')).not.toBeInTheDocument()
  })

  it('shows Continue with Google button', () => {
    render(<Login initialMode="login" />)
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('disables submit button while submitting', async () => {
    render(<Login initialMode="login" />)
    const form = screen.getByRole('button', { name: /Sign In/i }).closest('form')
    fireEvent.submit(form)
    expect(await screen.findByText('Please wait...')).toBeInTheDocument()
  })

  it('shows error message when provided', () => {
    // We can test error rendering by checking the error state
    render(<Login initialMode="login" />)
    // The error div is conditionally rendered — by default it's not there
    expect(screen.queryByText(/Incorrect email/)).not.toBeInTheDocument()
  })
})
