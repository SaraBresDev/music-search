import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { instrumentSearchOptions } from '@/lib/queries'
import { SearchForm } from '@/components/SearchForm'
import { InstrumentCard } from '@/components/InstrumentCard'
import { Spinner } from '@/components/Spinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { getErrorMessage } from '@/lib/errors'
import { MIN_INSTRUMENT_SEARCH_LENGTH } from '@/lib/wikidataValidation'

export const Route = createFileRoute('/')({
  component: SearchPage,
})

function SearchPage() {
  const [query, setQuery] = useState('')

  const {
    data: instruments,
    isError,
    isFetching,
    error,
    refetch,
  } = useQuery(instrumentSearchOptions(query))

  const hasSearched = query.trim().length > 0
  /** First load for this query key: no cached rows yet (undefined), not an error. */
  const blockingSearch =
    hasSearched && !isError && isFetching && instruments === undefined
  const showRefetchHint =
    hasSearched && !isError && isFetching && instruments !== undefined
  const isEmpty = hasSearched && !isFetching && instruments?.length === 0

  return (
    <div className="flex flex-col gap-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
          Search Musical Instruments
        </h1>
        <p className="text-white/50 text-sm">Powered by Wikidata + Wikipedia</p>
      </div>

      <SearchForm onSearch={setQuery} isLoading={isFetching} />

      {showRefetchHint ? (
        <p className="text-center text-xs text-white/45" role="status" aria-live="polite">
          Updating results…
        </p>
      ) : null}

      {blockingSearch ? (
        <div
          className="flex justify-center py-16"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading search results"
        >
          <Spinner className="h-8 w-8 text-amber-400" />
        </div>
      ) : null}

      {isError ? (
        <ErrorMessage
          message={getErrorMessage(
            error,
            'Failed to fetch instruments. Check your connection.'
          )}
          onRetry={() => void refetch()}
        />
      ) : null}

      {isEmpty ? (
        <div className="text-center py-16 text-white/40">
          <p className="text-5xl mb-4" aria-hidden>
            🔍
          </p>
          <p>{`No instruments found for "${query}"`}</p>
          <p className="text-xs mt-2 text-white/30">
            Tip: try at least {MIN_INSTRUMENT_SEARCH_LENGTH} characters.
          </p>
        </div>
      ) : null}

      {instruments && instruments.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {instruments.map((instrument) => (
            <InstrumentCard key={instrument.id} instrument={instrument} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
