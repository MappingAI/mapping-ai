import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CustomSelect, type SelectOption } from '../../components/CustomSelect'

const options: SelectOption[] = [
  { value: 'Executive', label: 'Executive (CEO, CTO)', color: '#d4644a' },
  { value: 'Researcher', label: 'Researcher (academic)', color: '#2d8a6e' },
  { value: 'Policymaker', label: 'Policymaker (legislator)', color: '#9955cc' },
]

describe('CustomSelect', () => {
  it('renders placeholder when no value selected', () => {
    render(<CustomSelect options={options} value="" onChange={() => {}} />)
    expect(screen.getByText('Select...')).toBeDefined()
  })

  it('renders selected option label', () => {
    render(<CustomSelect options={options} value="Executive" onChange={() => {}} />)
    expect(screen.getByText('Executive (CEO, CTO)')).toBeDefined()
  })

  it('opens dropdown on click', () => {
    render(<CustomSelect options={options} value="" onChange={() => {}} />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeDefined()
  })

  it('calls onChange when option selected', () => {
    const onChange = vi.fn()
    render(<CustomSelect options={options} value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.mouseDown(screen.getByText('Researcher (academic)'))
    expect(onChange).toHaveBeenCalledWith('Researcher')
  })

  it('click-to-deselect: clicking selected option clears value', () => {
    const onChange = vi.fn()
    render(<CustomSelect options={options} value="Executive" onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox'))
    // The text appears both in trigger and dropdown — target the option element
    const selectedOption = screen.getByRole('option', { selected: true })
    fireEvent.mouseDown(selectedOption)
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('filters options by search text', () => {
    render(<CustomSelect options={options} value="" onChange={() => {}} />)
    fireEvent.click(screen.getByRole('combobox'))
    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'policy' } })
    expect(screen.getByText('Policymaker (legislator)')).toBeDefined()
    expect(screen.queryByText('Executive (CEO, CTO)')).toBeNull()
  })

  it('shows "No options" when search has no matches', () => {
    render(<CustomSelect options={options} value="" onChange={() => {}} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByPlaceholderText('Search...'), {
      target: { value: 'zzzzz' },
    })
    expect(screen.getByText('No options')).toBeDefined()
  })

  it('closes on Escape key', () => {
    render(<CustomSelect options={options} value="" onChange={() => {}} />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeDefined()
    fireEvent.keyDown(screen.getByRole('combobox').parentElement!, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('does not open when disabled', () => {
    render(<CustomSelect options={options} value="" onChange={() => {}} disabled />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
