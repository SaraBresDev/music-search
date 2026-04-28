import { useState, type FormEvent } from 'react'
import { MIN_INSTRUMENT_SEARCH_LENGTH } from '@/lib/wikidataValidation'

interface Props {
  onSearch: (query: string) => void
  isLoading: boolean
  initialQuery?: string
}

export function SearchForm({ onSearch, isLoading, initialQuery = '' }: Props) {
  const [value, setValue] = useState(initialQuery)
  const canSearch = value.trim().length >= MIN_INSTRUMENT_SEARCH_LENGTH

  function handleChange(nextValue: string) {
    const wasNonEmpty = value.trim().length > 0
    const isNowEmpty = nextValue.trim().length === 0
    setValue(nextValue)
    if (wasNonEmpty && isNowEmpty) {
      // Native search clear ("X") should reset active results immediately.
      onSearch('')
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed.length >= MIN_INSTRUMENT_SEARCH_LENGTH) onSearch(trimmed)
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="flex gap-3 w-full"
        role="search"
        aria-label="Instrument search"
        aria-busy={isLoading}
      >
        <input
          type="search"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search instruments…"
          aria-label="Instrument name"
          autoComplete="off"
          className="flex-1 rounded-xl bg-white/10 border border-white/20 px-5 py-3 text-white placeholder:text-white/40 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !canSearch}
          aria-disabled={isLoading || !canSearch}
          className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
        >
          {isLoading ? '…' : 'Search'}
        </button>
      </form>
      {!canSearch && (
        <p className="mt-2 text-xs text-white/40">
          Type at least {MIN_INSTRUMENT_SEARCH_LENGTH} characters to search.
        </p>
      )}
    </div>
  )
}
