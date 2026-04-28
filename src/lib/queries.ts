import { queryOptions } from '@tanstack/react-query'
import {
  searchInstruments,
  getInstrumentDetail,
  getNotablePlayersForInstrument,
} from '@/api/wikidata'
import {
  canRunInstrumentSearch,
  isValidWikidataItemId,
  normalizeInstrumentSearchQuery,
} from '@/lib/wikidataValidation'

export const queryKeys = {
  instruments: (q: string) => ['instruments', q] as const,
  instrument: (id: string) => ['instrument', id] as const,
  notablePlayers: (id: string) => ['notablePlayers', id] as const,
}

export const instrumentSearchOptions = (query: string) =>
  {
    const normalized = normalizeInstrumentSearchQuery(query)
    return queryOptions({
      queryKey: queryKeys.instruments(normalized),
      queryFn: () => searchInstruments(normalized),
      enabled: canRunInstrumentSearch(normalized),
      staleTime: 1000 * 60 * 5,
    })
  }

export const instrumentDetailOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.instrument(id),
    queryFn: () => getInstrumentDetail(id),
    enabled: isValidWikidataItemId(id),
    staleTime: 1000 * 60 * 10,
  })

export const notablePlayersOptions = (instrumentId: string) =>
  queryOptions({
    queryKey: queryKeys.notablePlayers(instrumentId),
    queryFn: () => getNotablePlayersForInstrument(instrumentId),
    enabled: isValidWikidataItemId(instrumentId),
    staleTime: 1000 * 60 * 10,
  })
