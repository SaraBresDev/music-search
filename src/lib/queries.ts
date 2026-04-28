import { queryOptions } from '@tanstack/react-query'
import {
  searchInstruments,
  getInstrumentDetail,
  getNotablePlayersForInstrument,
} from '@/api/wikidata'
import {
  canRunInstrumentSearch,
  isValidWikidataItemId,
  normalizeWikidataItemId,
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
      queryFn: ({ signal }) => searchInstruments(normalized, signal),
      enabled: canRunInstrumentSearch(normalized),
      staleTime: 1000 * 60 * 5,
    })
  }

export const instrumentDetailOptions = (id: string) => {
  const normalizedId = normalizeWikidataItemId(id)
  return queryOptions({
    queryKey: queryKeys.instrument(normalizedId || id),
    queryFn: ({ signal }) => getInstrumentDetail(normalizedId || id, signal),
    enabled: isValidWikidataItemId(normalizedId || id),
    staleTime: 1000 * 60 * 10,
  })
}

export const notablePlayersOptions = (instrumentId: string) => {
  const normalizedId = normalizeWikidataItemId(instrumentId)
  return queryOptions({
    queryKey: queryKeys.notablePlayers(normalizedId || instrumentId),
    queryFn: ({ signal }) =>
      getNotablePlayersForInstrument(normalizedId || instrumentId, signal),
    enabled: isValidWikidataItemId(normalizedId || instrumentId),
    staleTime: 1000 * 60 * 10,
  })
}
