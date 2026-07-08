import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PasswordInput from '../components/PasswordInput'

describe('PasswordInput', () => {
  it('renders a password input by default', () => {
    render(<PasswordInput value="" onChange={() => {}} />)
    const input = screen.getByPlaceholderText('Enter your password')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'password')
  })

  it('toggles visibility when show/hide button is clicked', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />)
    const input = screen.getByPlaceholderText('Enter your password')
    expect(input).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button')
    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('calls onChange when value changes', () => {
    const handleChange = vi.fn()
    render(<PasswordInput value="" onChange={handleChange} />)
    const input = screen.getByPlaceholderText('Enter your password')
    fireEvent.change(input, { target: { value: 'newpass' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('accepts a custom placeholder', () => {
    render(<PasswordInput value="" onChange={() => {}} placeholder="Custom" />)
    expect(screen.getByPlaceholderText('Custom')).toBeInTheDocument()
  })

  it('renders the aria-label on toggle button', () => {
    render(<PasswordInput value="" onChange={() => {}} />)
    const toggle = screen.getByRole('button')
    expect(toggle).toHaveAttribute('aria-label', 'Show password')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-label', 'Hide password')
  })
})
