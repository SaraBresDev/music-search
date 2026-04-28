import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchForm } from '@/components/SearchForm'
import { MIN_INSTRUMENT_SEARCH_LENGTH } from '@/lib/wikidataValidation'

describe('SearchForm', () => {
  it('does not call onSearch when query is too short', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchForm onSearch={onSearch} isLoading={false} />)

    await user.type(screen.getByRole('searchbox', { name: 'Instrument name' }), 'a')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).not.toHaveBeenCalled()
  })

  it('submits trimmed query when long enough', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchForm onSearch={onSearch} isLoading={false} />)

    const needle = 'a'.repeat(MIN_INSTRUMENT_SEARCH_LENGTH)
    await user.type(
      screen.getByRole('searchbox', { name: 'Instrument name' }),
      `  ${needle}  `
    )
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith(needle)
  })

  it('disables submit while loading', () => {
    render(<SearchForm onSearch={vi.fn()} isLoading />)
    expect(screen.getByRole('button', { name: '…' })).toBeDisabled()
  })
})
