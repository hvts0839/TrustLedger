import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Dashboard from '../pages/Dashboard'
import { mockApi } from './setup'

const mockNav = vi.fn()

const mockStats = {
  totalOutstanding: 150000,
  totalOverdue: 50000,
  totalInterest: 3125.50,
  resolvedThisMonth: 25000,
  overdueCount: 3,
  outstandingCount: 8,
  monthlyData: [
    { month: 'Feb 2026', invoices: 5, paid: 2 },
    { month: 'Mar 2026', invoices: 8, paid: 3 },
    { month: 'Apr 2026', invoices: 6, paid: 4 },
    { month: 'May 2026', invoices: 7, paid: 1 },
    { month: 'Jun 2026', invoices: 10, paid: 5 },
    { month: 'Jul 2026', invoices: 4, paid: 2 },
  ],
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.get.mockResolvedValue(mockStats)
  })

  it('renders dashboard title', async () => {
    render(<Dashboard nav={mockNav} />)
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })

  it('renders New Invoice button', async () => {
    render(<Dashboard nav={mockNav} />)
    expect(await screen.findByText('New Invoice')).toBeInTheDocument()
  })

  it('renders stat cards with data from API', async () => {
    render(<Dashboard nav={mockNav} />)
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByText(/Interest Accrued/)).toBeInTheDocument()
    expect(screen.getAllByText(/Outstanding/)[0]).toBeInTheDocument()
    expect(screen.getByText(/Paid This Month/)).toBeInTheDocument()
  })

  it('renders overdue alert when there are overdue invoices', async () => {
    render(<Dashboard nav={mockNav} />)
    expect(await screen.findByText(/invoices overdue/)).toBeInTheDocument()
  })

  it('renders navigation cards', async () => {
    render(<Dashboard nav={mockNav} />)
    expect(await screen.findByText('All Invoices')).toBeInTheDocument()
    expect(screen.getAllByText('Overdue')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Outstanding')[0]).toBeInTheDocument()
    expect(screen.getByText('Transactions')).toBeInTheDocument()
  })

  it('renders monthly chart section', async () => {
    render(<Dashboard nav={mockNav} />)
    expect(await screen.findByText('Monthly Invoice Volume')).toBeInTheDocument()
  })

  it('does not render overdue alert when none overdue', async () => {
    mockApi.get.mockResolvedValue({ ...mockStats, overdueCount: 0 })
    render(<Dashboard nav={mockNav} />)
    await screen.findByText('Dashboard')
    expect(screen.queryByText(/invoices overdue/)).not.toBeInTheDocument()
  })
})
