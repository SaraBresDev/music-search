import { useState, type FormEvent } from 'react'
import { MIN_INSTRUMENT_SEARCH_LENGTH } from '@/lib/wikidataValidation'

interface Props {
  onSearch: (query: string) => void
  isLoading: boolean
}

export function SearchForm({ onSearch, isLoading }: Props) {
  const [value, setValue] = useState('')
  const canSearch = value.trim().length >= MIN_INSTRUMENT_SEARCH_LENGTH

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed.length >= MIN_INSTRUMENT_SEARCH_LENGTH) onSearch(trimmed)
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-3 w-full">
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search instruments…"
          aria-label="Search instruments"
          className="flex-1 rounded-xl bg-white/10 border border-white/20 px-5 py-3 text-white placeholder:text-white/40 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !canSearch}
          className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
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
