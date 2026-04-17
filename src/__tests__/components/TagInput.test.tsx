import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TagInput, type Tag, type TagSearchResult } from '../../components/TagInput'

const mockSearch = vi.fn((query: string): TagSearchResult[] => {
  const all = [
    { id: 1, label: 'Anthropic', detail: 'Frontier Lab' },
    { id: 2, label: 'OpenAI', detail: 'Frontier Lab' },
    { id: 3, label: 'Google DeepMind', detail: 'Frontier Lab' },
  ]
  return all.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()))
})

describe('TagInput', () => {
  it('renders placeholder when no tags', () => {
    render(<TagInput tags={[]} onTagsChange={() => {}} searchFn={mockSearch} />)
    expect(screen.getByPlaceholderText('Search...')).toBeDefined()
  })

  it('renders existing tags with remove buttons', () => {
    const tags: Tag[] = [{ id: 1, label: 'Anthropic' }]
    render(<TagInput tags={tags} onTagsChange={() => {}} searchFn={mockSearch} />)
    expect(screen.getByText('Anthropic')).toBeDefined()
    expect(screen.getByLabelText('Remove Anthropic')).toBeDefined()
  })

  it('removes tag on × click', () => {
    const tags: Tag[] = [
      { id: 1, label: 'Anthropic' },
      { id: 2, label: 'OpenAI' },
    ]
    const onChange = vi.fn()
    render(<TagInput tags={tags} onTagsChange={onChange} searchFn={mockSearch} />)
    fireEvent.click(screen.getByLabelText('Remove Anthropic'))
    expect(onChange).toHaveBeenCalledWith([{ id: 2, label: 'OpenAI' }])
  })

  it('removes last tag on backspace in empty input', () => {
    const tags: Tag[] = [{ id: 1, label: 'Anthropic' }]
    const onChange = vi.fn()
    render(<TagInput tags={tags} onTagsChange={onChange} searchFn={mockSearch} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('searches and shows results on input', async () => {
    render(<TagInput tags={[]} onTagsChange={() => {}} searchFn={mockSearch} debounceMs={0} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'open' } })
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeDefined()
    })
  })

  it('adds tag on result click', async () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onTagsChange={onChange} searchFn={mockSearch} debounceMs={0} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'open' } })
    await waitFor(() => screen.getByText('OpenAI'))
    fireEvent.mouseDown(screen.getByText('OpenAI'))
    expect(onChange).toHaveBeenCalledWith([{ id: 2, label: 'OpenAI', meta: undefined }])
  })

  it('prevents duplicate tags', async () => {
    const tags: Tag[] = [{ id: 2, label: 'OpenAI' }]
    render(<TagInput tags={tags} onTagsChange={() => {}} searchFn={mockSearch} debounceMs={0} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'open' } })
    await waitFor(() => {
      // Search for "open" matches only OpenAI, but it should be filtered out since it's a tag
      // So the dropdown should either be empty or not show the OpenAI result
      const dropdownItems = document.querySelectorAll(
        '[class*="cursor-pointer"][class*="font-mono"]',
      )
      const texts = Array.from(dropdownItems).map((el) => el.textContent)
      expect(texts.some((t) => t?.includes('OpenAI'))).toBe(false)
    })
  })

  it('hides input when maxTags reached', () => {
    const tags: Tag[] = [{ id: 1, label: 'Anthropic' }]
    render(<TagInput tags={tags} onTagsChange={() => {}} searchFn={mockSearch} maxTags={1} />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
