import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { instrumentDetailOptions, notablePlayersOptions } from '@/lib/queries'
import { Spinner } from '@/components/Spinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { TopPlayerRow } from '@/components/TopPlayerRow'
import { INSTRUMENT_IMAGE_PLACEHOLDER } from '@/lib/constants'
import { getErrorMessage } from '@/lib/errors'

interface Props {
  instrumentId: string
  query?: string
}

export function InstrumentDetailContent({ instrumentId, query }: Props) {
  const instrumentQ = useQuery(instrumentDetailOptions(instrumentId))
  const playersQ = useQuery(notablePlayersOptions(instrumentId))

  if (instrumentQ.isPending) {
    return (
      <div
        className="flex justify-center py-32"
        role="status"
        aria-label="Loading instrument details"
      >
        <Spinner className="h-10 w-10 text-amber-400" />
      </div>
    )
  }

  if (instrumentQ.isError || !instrumentQ.data) {
    return (
      <ErrorMessage
        message={getErrorMessage(instrumentQ.error, 'Instrument not found.')}
        onRetry={() => void instrumentQ.refetch()}
      />
    )
  }

  const instrument = instrumentQ.data

  return (
    <div className="flex flex-col gap-10">
      <Link
        to="/"
        search={{ q: query ?? '' }}
        className="inline-flex items-center gap-2 text-white/50 hover:text-amber-400 transition-colors text-sm w-fit rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
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
          <div
            className="flex justify-center py-8"
            role="status"
            aria-label="Loading notable players"
          >
            <Spinner className="h-6 w-6 text-amber-400" />
          </div>
        )}
        {playersQ.isError && (
          <ErrorMessage
            title="Could not load players"
            message={getErrorMessage(
              playersQ.error,
              'Could not load players. Try again later.'
            )}
            onRetry={() => void playersQ.refetch()}
          />
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
