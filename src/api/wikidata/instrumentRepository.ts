import type { InstrumentDetail, InstrumentSearchResult, NotablePlayer } from '@/types'
import {
  isValidWikidataItemId,
  MIN_INSTRUMENT_SEARCH_LENGTH,
  normalizeInstrumentSearchQuery,
} from '@/lib/wikidataValidation'
import {
  sparqlInstrumentDetail,
  sparqlNotablePlayersForInstrument,
  sparqlInstrumentSearchLabelPrefix,
  sparqlInstrumentSearchLabelSubstring,
  sparqlEscapeDoubleQuoted,
} from './instrumentSparql'
import {
  bindingString,
  fetchSparql,
  qidFromEntityUrl,
  type SparqlBinding,
} from './sparqlClient'
import { fetchWikipediaExtract } from './wikipediaClient'
import {
  fetchWikidataEntitySnapshots,
  fetchWikidataEnglishDescription,
  searchWikidataEntityIds,
  type WikidataEntitySnapshot,
} from './wikidataEntityClient'

const WD_MUSICAL_INSTRUMENT_QID = 'Q34379'
const SEARCH_CANDIDATE_LIMIT = 40
const CLASSIFICATION_DEPTH_LIMIT = 7
const CLASSIFICATION_NODE_LIMIT = 450

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

function mapSearchSnapshot(entity: WikidataEntitySnapshot): InstrumentSearchResult {
  return {
    id: entity.id,
    name: entity.label ?? 'Unknown instrument',
    imageUrl: entity.imageUrl,
    wikipediaTitle: entity.wikipediaTitle,
  }
}

function mapSearchRow(b: SparqlBinding): InstrumentSearchResult {
  return {
    id: qidFromEntityUrl(bindingString(b, 'item') ?? ''),
    name: bindingString(b, 'itemLabel') ?? 'Unknown instrument',
    imageUrl: bindingString(b, 'image'),
    wikipediaTitle: bindingString(b, 'wikipediaTitle'),
  }
}

function isHighConfidenceInstrument(entity: WikidataEntitySnapshot): boolean {
  const normalized = (entity.label ?? '').trim()
  if (!normalized) return false
  // Drop lexeme-like labels ("Pipa.1") that are usually not user-facing entities.
  if (/\.\d+$/.test(normalized)) return false
  // Drop likely variants/disambiguations that are noisier in strict mode.
  if (normalized.includes(',')) return false
  // Strict precision mode: require visible evidence from Wikimedia.
  return Boolean(entity.imageUrl || entity.wikipediaTitle)
}

function isHighConfidenceResult(result: InstrumentSearchResult): boolean {
  const normalized = result.name.trim()
  if (!normalized) return false
  if (/\.\d+$/.test(normalized)) return false
  if (normalized.includes(',')) return false
  return Boolean(result.imageUrl || result.wikipediaTitle)
}

async function searchInstrumentsByLabelPrefix(
  q: string,
  signal?: AbortSignal
): Promise<InstrumentSearchResult[]> {
  const prefix = sparqlEscapeDoubleQuoted(q)
  const data = await fetchSparql(sparqlInstrumentSearchLabelPrefix(prefix), signal)
  return dedupeByName((data.results.bindings ?? []).map(mapSearchRow))
}

async function searchInstrumentsByLabelSubstring(
  q: string,
  signal?: AbortSignal
): Promise<InstrumentSearchResult[]> {
  const needle = sparqlEscapeDoubleQuoted(q)
  const data = await fetchSparql(sparqlInstrumentSearchLabelSubstring(needle), signal)
  return dedupeByName((data.results.bindings ?? []).map(mapSearchRow))
}

async function fetchEntityClosure(
  seedQids: string[],
  signal?: AbortSignal
): Promise<Map<string, WikidataEntitySnapshot>> {
  const graph = new Map<string, WikidataEntitySnapshot>()
  const visited = new Set<string>()
  let frontier = [...new Set(seedQids)]

  for (let depth = 0; depth < CLASSIFICATION_DEPTH_LIMIT; depth += 1) {
    const batch = frontier.filter((id) => !visited.has(id))
    if (batch.length === 0) break
    if (visited.size >= CLASSIFICATION_NODE_LIMIT) break

    for (const id of batch) visited.add(id)
    const snapshots = await fetchWikidataEntitySnapshots(batch, signal)

    const next = new Set<string>()
    for (const [id, entity] of snapshots.entries()) {
      graph.set(id, entity)
      for (const parentId of [...entity.instanceOfIds, ...entity.subclassOfIds]) {
        if (!visited.has(parentId) && visited.size + next.size < CLASSIFICATION_NODE_LIMIT) {
          next.add(parentId)
        }
      }
    }
    frontier = [...next]
  }

  return graph
}

function reachesMusicalInstrumentClass(
  qid: string,
  graph: Map<string, WikidataEntitySnapshot>,
  memo: Map<string, boolean>,
  visiting: Set<string>
): boolean {
  if (qid === WD_MUSICAL_INSTRUMENT_QID) return true
  const known = memo.get(qid)
  if (known !== undefined) return known
  if (visiting.has(qid)) return false

  visiting.add(qid)
  const node = graph.get(qid)
  if (!node) {
    visiting.delete(qid)
    memo.set(qid, false)
    return false
  }

  const parents = [...node.instanceOfIds, ...node.subclassOfIds]
  for (const parent of parents) {
    if (parent === WD_MUSICAL_INSTRUMENT_QID) {
      visiting.delete(qid)
      memo.set(qid, true)
      return true
    }
    if (reachesMusicalInstrumentClass(parent, graph, memo, visiting)) {
      visiting.delete(qid)
      memo.set(qid, true)
      return true
    }
  }

  visiting.delete(qid)
  memo.set(qid, false)
  return false
}

async function searchInstrumentsByCandidateIds(
  query: string,
  signal?: AbortSignal
): Promise<InstrumentSearchResult[]> {
  const candidateIds = await searchWikidataEntityIds(query, SEARCH_CANDIDATE_LIMIT, signal)
  if (candidateIds.length === 0) return []

  const graph = await fetchEntityClosure(candidateIds, signal)
  const memo = new Map<string, boolean>()
  const normalizedQuery = query.trim().toLowerCase()
  const requirePrefix = normalizedQuery.length <= 2

  const matches: InstrumentSearchResult[] = []
  for (const id of candidateIds) {
    const entity = graph.get(id)
    if (!entity) continue
    if (!reachesMusicalInstrumentClass(id, graph, memo, new Set())) continue
    if (!isHighConfidenceInstrument(entity)) continue
    if (
      requirePrefix &&
      entity.label &&
      !entity.label.trim().toLowerCase().startsWith(normalizedQuery)
    ) {
      continue
    }
    matches.push(mapSearchSnapshot(entity))
  }

  return dedupeByName(matches)
}

/**
 * Search flow:
 * - Action API candidate list (`wbsearchentities`) for low-latency retrieval.
 * - Cached entity closure (`wbgetentities`) for class graph filtering without WDQS search.
 * - Strict confidence filter for UI-quality results (image/wiki evidence).
 */
export async function searchInstruments(
  query: string,
  signal?: AbortSignal
): Promise<InstrumentSearchResult[]> {
  const q = normalizeInstrumentSearchQuery(query)
  if (!q || q.length < MIN_INSTRUMENT_SEARCH_LENGTH) return []

  const primary = await searchInstrumentsByCandidateIds(q, signal)
  if (primary.length > 0) return primary

  // Fallback for short/ambiguous terms (e.g. "pi") when Action API candidates are too broad.
  if (q.length <= 2) {
    const prefix = await searchInstrumentsByLabelPrefix(q, signal)
    return prefix.filter(isHighConfidenceResult)
  }

  const substring = await searchInstrumentsByLabelSubstring(q, signal)
  return substring.filter(isHighConfidenceResult)
}

export async function getInstrumentDetail(
  id: string,
  signal?: AbortSignal
): Promise<InstrumentDetail | null> {
  const qid = id.trim()
  if (!isValidWikidataItemId(qid)) return null

  const data = await fetchSparql(sparqlInstrumentDetail(qid), signal)
  const row = data.results.bindings?.[0]
  if (!row) return null

  const name = bindingString(row, 'itemLabel') ?? 'Unknown instrument'
  const imageUrl = bindingString(row, 'image')
  const wikipediaTitle = bindingString(row, 'wikipediaTitle')

  let description = (await fetchWikipediaExtract(wikipediaTitle, signal))?.trim()
  if (!description) {
    description = (await fetchWikidataEnglishDescription(qid, signal))?.trim()
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
  instrumentId: string,
  signal?: AbortSignal
): Promise<NotablePlayer[]> {
  const qid = instrumentId.trim()
  if (!isValidWikidataItemId(qid)) return []

  const data = await fetchSparql(sparqlNotablePlayersForInstrument(qid), signal)

  return (data.results.bindings ?? [])
    .map((b) => ({
      id: qidFromEntityUrl(bindingString(b, 'person') ?? ''),
      name: bindingString(b, 'personLabel') ?? 'Unknown',
      imageUrl: bindingString(b, 'image'),
    }))
    .filter((p) => isValidWikidataItemId(p.id))
}
