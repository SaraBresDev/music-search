import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Spinner } from '@/components/Spinner'
import { isValidWikidataItemId } from '@/lib/wikidataValidation'

const InstrumentDetailContent = lazy(() =>
  import('@/components/InstrumentDetailContent').then((m) => ({
    default: m.InstrumentDetailContent,
  }))
)

export const Route = createFileRoute('/instrument/$id')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
  }),
  component: InstrumentDetailPage,
})

function InstrumentDetailPage() {
  const { id } = Route.useParams()
  const { q } = Route.useSearch()
  const instrumentId = String(id)

  if (!isValidWikidataItemId(instrumentId)) {
    return (
      <ErrorMessage message="Invalid instrument id. Expected a Wikidata item id such as Q5994." />
    )
  }

  return (
    <Suspense
      fallback={
        <div
          className="flex justify-center py-32"
          role="status"
          aria-label="Loading instrument page"
        >
          <Spinner className="h-10 w-10 text-amber-400" />
        </div>
      }
    >
      <InstrumentDetailContent instrumentId={instrumentId} query={q} />
    </Suspense>
  )
}
