import { Link } from '@tanstack/react-router'
import type { InstrumentSearchResult } from '@/types'
import { INSTRUMENT_IMAGE_PLACEHOLDER } from '@/lib/constants'

interface Props {
  instrument: InstrumentSearchResult
  query?: string
}

export function InstrumentCard({ instrument, query }: Props) {
  const label = `Open details for ${instrument.name}`

  return (
    <Link
      to="/instrument/$id"
      params={{ id: instrument.id }}
      search={{ q: query ?? '' }}
      aria-label={label}
      className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-400/10 cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
    >
      <div className="aspect-square overflow-hidden bg-black/10">
        <img
          src={instrument.imageUrl || INSTRUMENT_IMAGE_PLACEHOLDER}
          alt={instrument.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h2 className="text-white font-bold text-sm sm:text-base leading-tight line-clamp-2">
          {instrument.name}
        </h2>
        <p className="mt-1 text-white/60 text-xs truncate">
          {`Wikidata: ${instrument.id}`}
        </p>
      </div>
    </Link>
  )
}
