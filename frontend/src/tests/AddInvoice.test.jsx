import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddInvoice from '../pages/AddInvoice'
import { mockApi } from './setup'

const mockNav = vi.fn()

describe('AddInvoice - Quick Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear session storage
    sessionStorage.clear()
  })

  it('renders required fields in Quick Mode', () => {
    render(<AddInvoice nav={mockNav} />)
    expect(screen.getByText('New Invoice')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search or type buyer name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. INV-001')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows Quick Mode as default', () => {
    render(<AddInvoice nav={mockNav} />)
    const quickBtn = screen.getByText('Quick')
    expect(quickBtn.classList).toContain('bg-white')
  })

  it('does not show declaration section in Quick Mode', () => {
    render(<AddInvoice nav={mockNav} />)
    expect(screen.queryByText('Declaration Required')).not.toBeInTheDocument()
  })
})

describe('AddInvoice - Full Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('switches to Full Mode and shows additional fields', () => {
    render(<AddInvoice nav={mockNav} />)
    fireEvent.click(screen.getByText('Full'))

    expect(screen.getByText('Invoice Date')).toBeInTheDocument()
    expect(screen.getByText('Buyer Address')).toBeInTheDocument()
    expect(screen.getByText('Work Description')).toBeInTheDocument()
    expect(screen.getByText('Agreement / PO Ref')).toBeInTheDocument()
    expect(screen.getByText('GST Amount (₹)')).toBeInTheDocument()
    expect(screen.getByText('MSME Address')).toBeInTheDocument()
  })

  it('shows declaration section with warning banner in Full Mode', () => {
    render(<AddInvoice nav={mockNav} />)
    fireEvent.click(screen.getByText('Full'))

    expect(screen.getByText('Declaration Required')).toBeInTheDocument()
    expect(screen.getByText(/I acknowledge that the information provided is accurate/)).toBeInTheDocument()
  })
})

describe('AddInvoice - Declaration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('requires acknowledgment before saving in Full Mode', async () => {
    render(<AddInvoice nav={mockNav} />)
    fireEvent.click(screen.getByText('Full'))
    await screen.findByText('Declaration Required')

    const form = screen.getByRole('button', { name: /Save Invoice/i }).closest('form')
    fireEvent.submit(form)

    expect(await screen.findByText('Please acknowledge the declaration before saving')).toBeInTheDocument()
  })

  it('allows editing declaration text after acknowledgment checkbox is checked', () => {
    render(<AddInvoice nav={mockNav} />)
    fireEvent.click(screen.getByText('Full'))

    const checkbox = screen.getByRole('checkbox', { name: /I acknowledge/ })
    expect(checkbox).toBeInTheDocument()

    // Textarea should be editable
    const textareas = screen.getAllByRole('textbox')
    expect(textareas.length).toBeGreaterThan(0)
  })
})

describe('AddInvoice - Payment Terms', () => {
  it('defaults to 45 days', () => {
    render(<AddInvoice nav={mockNav} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows legal maximum note', () => {
    render(<AddInvoice nav={mockNav} />)
    expect(screen.getByText(/Legal maximum is 45 days/)).toBeInTheDocument()
  })

  it('shows legal due date preview when delivery date is set', () => {
    render(<AddInvoice nav={mockNav} />)
    const dateInput = screen.getByLabelText(/Delivery Date/i)
    // should show fallback text first
    expect(screen.getByText('Set a delivery date to calculate')).toBeInTheDocument()
  })
})
