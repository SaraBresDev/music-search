import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { instrumentDetailOptions, notablePlayersOptions } from '@/lib/queries'
import { Spinner } from '@/components/Spinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { TopPlayerRow } from '@/components/TopPlayerRow'
import { INSTRUMENT_IMAGE_PLACEHOLDER } from '@/lib/constants'
import { getErrorMessage } from '@/lib/errors'
import { isValidWikidataItemId } from '@/lib/wikidataValidation'

export const Route = createFileRoute('/instrument/$id')({
  component: InstrumentDetailPage,
})

function InstrumentDetailPage() {
  const { id } = Route.useParams()
  const instrumentId = String(id)

  const instrumentQ = useQuery(instrumentDetailOptions(instrumentId))
  const playersQ = useQuery(notablePlayersOptions(instrumentId))

  if (!isValidWikidataItemId(instrumentId)) {
    return (
      <ErrorMessage message="Invalid instrument id. Expected a Wikidata item id such as Q5994." />
    )
  }

  if (instrumentQ.isPending) {
    return (
      <div className="flex justify-center py-32">
        <Spinner className="h-10 w-10 text-amber-400" />
      </div>
    )
  }

  if (instrumentQ.isError || !instrumentQ.data) {
    return (
      <ErrorMessage
        message={getErrorMessage(instrumentQ.error, 'Instrument not found.')}
      />
    )
  }

  const instrument = instrumentQ.data

  return (
    <div className="flex flex-col gap-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-white/50 hover:text-amber-400 transition-colors text-sm w-fit"
      >
        ← Back to search
      </Link>

      <div className="flex flex-col sm:flex-row gap-8 items-start">
        <img
          src={instrument.imageUrl || INSTRUMENT_IMAGE_PLACEHOLDER}
          alt={instrument.name}
          className="w-full sm:w-56 h-56 object-cover rounded-2xl border border-white/10 shrink-0"
        />
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div>
            <span className="text-amber-400 text-xs font-bold tracking-widest uppercase">
              {instrument.id}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white mt-1">
              {instrument.name}
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {instrument.wikipediaTitle
                ? `Wikipedia: ${instrument.wikipediaTitle}`
                : 'Wikipedia: —'}
            </p>
          </div>

          <p className="text-white/70 text-sm leading-relaxed">
            {instrument.description ? instrument.description : 'No description found.'}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-4">Notable players</h2>
        <p className="text-white/35 text-xs mb-3">
          Musicians listed in Wikidata as playing this instrument.
        </p>
        {playersQ.isPending && (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 text-amber-400" />
          </div>
        )}
        {playersQ.isError && (
          <p className="text-red-400/90 text-sm">
            {getErrorMessage(
              playersQ.error,
              'Could not load players. Try again later.'
            )}
          </p>
        )}
        {!playersQ.isPending &&
          !playersQ.isError &&
          playersQ.data &&
          playersQ.data.length > 0 && (
            <div className="flex flex-col gap-2">
              {playersQ.data.map((player, i) => (
                <TopPlayerRow key={player.id} player={player} index={i} />
              ))}
            </div>
          )}
        {!playersQ.isPending &&
          !playersQ.isError &&
          (!playersQ.data || playersQ.data.length === 0) && (
            <p className="text-white/30 text-sm italic">No players found.</p>
          )}
      </div>
    </div>
  )
}

