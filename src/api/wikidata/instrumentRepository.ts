import type { InstrumentDetail, InstrumentSearchResult, NotablePlayer } from '@/types'
import {
  isValidWikidataItemId,
  MIN_INSTRUMENT_SEARCH_LENGTH,
  normalizeInstrumentSearchQuery,
} from '@/lib/wikidataValidation'
import {
  sparqlInstrumentDetail,
  sparqlInstrumentSearchByCandidateIds,
  sparqlInstrumentSearchLabelPrefix,
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
import {
  fetchWikidataEnglishDescription,
  searchWikidataEntityIds,
} from './wikidataEntityClient'

function dedupeByName<T extends { name: string; imageUrl?: string }>(items: T[]): T[] {
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
    wikipediaTitle: bindingString(b, 'wikipediaTitle'),
  }
}

function isHighConfidenceInstrument(result: InstrumentSearchResult): boolean {
  const normalized = result.name.trim()
  // Drop lexeme-like labels ("Pipa.1") that are usually not user-facing entities.
  if (/\.\d+$/.test(normalized)) return false
  // Drop likely variants/disambiguations that are noisier in strict mode.
  if (normalized.includes(',')) return false
  // Strict precision mode: require visible evidence from Wikimedia.
  return Boolean(result.imageUrl || result.wikipediaTitle)
}

async function searchInstrumentsByLabelSubstring(
  q: string
): Promise<InstrumentSearchResult[]> {
  const needle = sparqlEscapeDoubleQuoted(q)
  const data = await fetchSparql(sparqlInstrumentSearchLabelSubstring(needle))
  return dedupeByName((data.results.bindings ?? []).map(mapSearchRow))
}

async function searchInstrumentsByLabelPrefix(q: string): Promise<InstrumentSearchResult[]> {
  const prefix = sparqlEscapeDoubleQuoted(q)
  const data = await fetchSparql(sparqlInstrumentSearchLabelPrefix(prefix))
  return dedupeByName((data.results.bindings ?? []).map(mapSearchRow))
}

async function searchInstrumentsByCandidateIds(query: string): Promise<InstrumentSearchResult[]> {
  const candidateIds = await searchWikidataEntityIds(query, 32)
  if (candidateIds.length === 0) return []
  const data = await fetchSparql(sparqlInstrumentSearchByCandidateIds(candidateIds))
  return dedupeByName((data.results.bindings ?? []).map(mapSearchRow))
}

/**
 * Search flow:
 * - **All lengths >= MIN**: Action API candidate search + bounded SPARQL VALUES filter.
 * - **2 characters**: fallback to strict label prefix only (fast + low noise).
 * - **3+ characters**: if empty, fallback to label substring.
 */
export async function searchInstruments(
  query: string
): Promise<InstrumentSearchResult[]> {
  const q = normalizeInstrumentSearchQuery(query)
  if (!q || q.length < MIN_INSTRUMENT_SEARCH_LENGTH) return []

  const primary = await searchInstrumentsByCandidateIds(q)

  if (primary.length > 0) {
    const strict = primary.filter(isHighConfidenceInstrument)
    if (strict.length > 0) return strict
    return []
  }

  if (q.length === 2) {
    const prefix = await searchInstrumentsByLabelPrefix(q)
    const strict = prefix.filter(isHighConfidenceInstrument)
    return strict
  }

  const substring = await searchInstrumentsByLabelSubstring(q)
  return substring.filter(isHighConfidenceInstrument)
}

export async function getInstrumentDetail(id: string): Promise<InstrumentDetail | null> {
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
