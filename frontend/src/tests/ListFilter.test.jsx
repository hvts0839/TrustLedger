import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ListFilter from '../components/ListFilter'

const defaultConfig = {
  sortOptions: { buyerName: 'Buyer', amount: 'Amount', deliveryDate: 'Date' },
  filters: { buyer: true, amount: true, dateRange: true, status: true },
  statusOptions: [['outstanding', 'Outstanding'], ['paid', 'Paid']],
}

describe('ListFilter', () => {
  it('renders sort controls', () => {
    const onChange = vi.fn()
    render(<ListFilter config={defaultConfig} filters={{}} onChange={onChange} />)
    expect(screen.getByText('Sort by')).toBeInTheDocument()
  })

  it('shows order toggle when sort is selected', () => {
    const onChange = vi.fn()
    render(<ListFilter config={defaultConfig} filters={{ sortBy: 'amount' }} onChange={onChange} />)
    expect(screen.getByText('↓ Desc')).toBeInTheDocument()
  })

  it('calls onChange when sort option is changed', () => {
    const onChange = vi.fn()
    render(<ListFilter config={defaultConfig} filters={{}} onChange={onChange} />)
    const select = screen.getAllByRole('combobox')[0]
    fireEvent.change(select, { target: { value: 'amount' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'amount' }))
  })

  it('toggles sort order', () => {
    const onChange = vi.fn()
    render(<ListFilter config={defaultConfig} filters={{ sortBy: 'amount', sortOrder: 'desc' }} onChange={onChange} />)
    const orderBtn = screen.getByText('↓ Desc')
    fireEvent.click(orderBtn)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 'asc' }))
  })

  it('renders buyer filter input', () => {
    render(<ListFilter config={defaultConfig} filters={{}} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('Buyer name')).toBeInTheDocument()
  })

  it('renders amount min/max inputs', () => {
    render(<ListFilter config={defaultConfig} filters={{}} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('Min ₹')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Max ₹')).toBeInTheDocument()
  })

  it('renders date range inputs', () => {
    render(<ListFilter config={defaultConfig} filters={{}} onChange={vi.fn()} />)
    const dateInputs = screen.getAllByDisplayValue('')
    expect(dateInputs.length).toBeGreaterThan(0)
  })

  it('renders status filter', () => {
    render(<ListFilter config={defaultConfig} filters={{}} onChange={vi.fn()} />)
    expect(screen.getByText('All status')).toBeInTheDocument()
  })

  it('shows Clear button when filters are active', () => {
    render(<ListFilter config={defaultConfig} filters={{ buyer: 'test' }} onChange={vi.fn()} />)
    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('calls onChange with cleared filters on Clear', () => {
    const onChange = vi.fn()
    render(<ListFilter config={defaultConfig} filters={{ buyer: 'test', sortBy: 'amount' }} onChange={onChange} />)
    fireEvent.click(screen.getByText('Clear'))
    expect(onChange).toHaveBeenCalled()
  })

  it('renders daysOverdueRange filters when configured', () => {
    const config = {
      ...defaultConfig,
      filters: { ...defaultConfig.filters, daysOverdueRange: true },
    }
    render(<ListFilter config={config} filters={{}} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('Min days')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Max days')).toBeInTheDocument()
  })

  it('renders interestRange filters when configured', () => {
    const config = {
      ...defaultConfig,
      filters: { ...defaultConfig.filters, interestRange: true },
    }
    render(<ListFilter config={config} filters={{}} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('Min interest')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Max interest')).toBeInTheDocument()
  })
})
