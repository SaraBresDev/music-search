import type {
  InstrumentDetail,
  InstrumentSearchResult,
  NotablePlayer,
} from '@/types'
import {
  isValidWikidataItemId,
  MIN_INSTRUMENT_SEARCH_LENGTH,
  normalizeInstrumentSearchQuery,
} from '@/lib/wikidataValidation'
import {
  sparqlInstrumentDetail,
  sparqlInstrumentSearchEntitySearch,
  sparqlInstrumentSearchLabelSubstring,
  sparqlEscapeDoubleQuoted,
  sparqlNotablePlayersForInstrument,
} from './instrumentSparql'
import {
  bindingString,
  fetchSparql,
  qidFromEntityUrl,
  type SparqlBinding,
} from './sparqlClient'
import { fetchWikipediaExtract } from './wikipediaClient'
import { fetchWikidataEnglishDescription } from './wikidataEntityClient'

function dedupeByName<T extends { name: string; imageUrl?: string }>(
  items: T[]
): T[] {
  const byName = new Map<string, T>()
  for (const item of items) {
    const key = item.name.trim().toLowerCase()
    if (!key) continue
    const existing = byName.get(key)
    if (!existing) {
      byName.set(key, item)
      continue
    }
    if (!existing.imageUrl && item.imageUrl) byName.set(key, item)
  }
  return [...byName.values()]
}

function mapSearchRow(b: SparqlBinding): InstrumentSearchResult {
  return {
    id: qidFromEntityUrl(bindingString(b, 'item') ?? ''),
    name: bindingString(b, 'itemLabel') ?? 'Unknown instrument',
    imageUrl: bindingString(b, 'image'),
    wikipediaTitle: undefined,
  }
}

async function searchInstrumentsByLabelSubstring(
  q: string
): Promise<InstrumentSearchResult[]> {
  const needle = sparqlEscapeDoubleQuoted(q)
  const data = await fetchSparql(sparqlInstrumentSearchLabelSubstring(needle))
  return dedupeByName(
    (data.results.bindings ?? []).map(mapSearchRow)
  )
}

/**
 * Search flow:
 * - **2 characters**: only label substring on instrument items/classes (EntitySearch ranks by prefix, so "ia" misses "piano").
 * - **3+ characters**: EntitySearch → instrument filter; if empty, same substring fallback as above.
 */
export async function searchInstruments(
  query: string
): Promise<InstrumentSearchResult[]> {
  const q = normalizeInstrumentSearchQuery(query)
  if (!q || q.length < MIN_INSTRUMENT_SEARCH_LENGTH) return []

  if (q.length === 2) {
    return searchInstrumentsByLabelSubstring(q)
  }

  const searchEsc = sparqlEscapeDoubleQuoted(q)
  const data = await fetchSparql(sparqlInstrumentSearchEntitySearch(searchEsc))
  const primary = dedupeByName(
    (data.results.bindings ?? []).map(mapSearchRow)
  )

  if (primary.length > 0) return primary

  return searchInstrumentsByLabelSubstring(q)
}

export async function getInstrumentDetail(
  id: string
): Promise<InstrumentDetail | null> {
  const qid = id.trim()
  if (!isValidWikidataItemId(qid)) return null

  const data = await fetchSparql(sparqlInstrumentDetail(qid))
  const row = data.results.bindings?.[0]
  if (!row) return null

  const name = bindingString(row, 'itemLabel') ?? 'Unknown instrument'
  const imageUrl = bindingString(row, 'image')
  const wikipediaTitle = bindingString(row, 'wikipediaTitle')

  let description = (await fetchWikipediaExtract(wikipediaTitle))?.trim()
  if (!description) {
    description = (await fetchWikidataEnglishDescription(qid))?.trim()
  }

  return {
    id: qid,
    name,
    imageUrl,
    wikipediaTitle,
    description: description || undefined,
  }
}

export async function getNotablePlayersForInstrument(
  instrumentId: string
): Promise<NotablePlayer[]> {
  const qid = instrumentId.trim()
  if (!isValidWikidataItemId(qid)) return []

  const data = await fetchSparql(sparqlNotablePlayersForInstrument(qid))

  return (data.results.bindings ?? [])
    .map((b) => ({
      id: qidFromEntityUrl(bindingString(b, 'person') ?? ''),
      name: bindingString(b, 'personLabel') ?? 'Unknown',
      imageUrl: bindingString(b, 'image'),
    }))
    .filter((p) => isValidWikidataItemId(p.id))
}
