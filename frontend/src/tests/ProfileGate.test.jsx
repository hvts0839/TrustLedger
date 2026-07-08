import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'
import { mockApi } from './setup'

// Override the firebase mock for this test to simulate a logged-in user
vi.mock('../firebase', () => {
  const mockUnsubscribe = vi.fn()
  return {
    auth: {
      currentUser: {
        uid: 'test-uid',
        email: 'test@example.com',
        providerData: [{ providerId: 'email' }],
        getIdToken: () => Promise.resolve('mock-token'),
      },
      onAuthStateChanged: vi.fn((cb) => {
        setTimeout(() => cb({
          uid: 'test-uid',
          email: 'test@example.com',
          providerData: [{ providerId: 'email' }],
          getIdToken: () => Promise.resolve('mock-token'),
        }), 0)
        return mockUnsubscribe
      }),
    },
  }
})

describe('Profile completion gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // App.jsx calls api.get('/users/me') first, then Profile.jsx calls it again
    mockApi.get.mockResolvedValue({
      name: '',
      companyName: '',
      udyamNumber: '',
      email: 'test@example.com',
      phone: '',
      profileComplete: false,
      emailVerified: true,
      pinHash: '',
    })
  })

  it('redirects to profile page when profile is incomplete', async () => {
    render(<App />)
    const heading = await screen.findByText('Complete Your Profile', {}, { timeout: 3000 })
    expect(heading).toBeInTheDocument()
  })

  it('shows welcome banner for new users', async () => {
    render(<App />)
    const banner = await screen.findByText('Welcome to TrustLedger!', {}, { timeout: 3000 })
    expect(banner).toBeInTheDocument()
  })
})
