import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddInvoice from '../pages/AddInvoice'

const mockNav = vi.fn()

describe('Legal due date calculation display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('shows fallback text when no delivery date set', () => {
    render(<AddInvoice nav={mockNav} />)
    expect(screen.getByText('Set a delivery date to calculate')).toBeInTheDocument()
  })

  it('displays computed due date when delivery date and terms are set', () => {
    render(<AddInvoice nav={mockNav} />)

    const deliveryInput = screen.getByLabelText(/Delivery Date/i)
    fireEvent.change(deliveryInput, { target: { value: '2026-06-01' } })

    expect(screen.getByText(/Legal due date:/)).toBeInTheDocument()
    expect(screen.getByText(/16 July 2026/)).toBeInTheDocument()
  })

  it('updates due date when payment terms change', () => {
    render(<AddInvoice nav={mockNav} />)

    const deliveryInput = screen.getByLabelText(/Delivery Date/i)
    fireEvent.change(deliveryInput, { target: { value: '2026-06-01' } })

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '30' } })

    expect(screen.getByText(/1 July 2026/)).toBeInTheDocument()
  })
})
