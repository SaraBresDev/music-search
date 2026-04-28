import type { NotablePlayer } from '@/types'
import { INSTRUMENT_IMAGE_PLACEHOLDER } from '@/lib/constants'

interface Props {
  player: NotablePlayer
  index: number
}

export function TopPlayerRow({ player, index }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10 transition-colors">
      <span className="w-6 text-center text-amber-400 font-bold text-sm shrink-0">
        {index + 1}
      </span>
      <img
        src={player.imageUrl || INSTRUMENT_IMAGE_PLACEHOLDER}
        alt=""
        className="h-12 w-12 rounded-lg object-cover border border-white/10 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{player.name}</p>
        <p className="text-white/40 text-xs mt-0.5 truncate">{player.id}</p>
      </div>
    </div>
  )
}
