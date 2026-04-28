import { WIKIDATA_ACTION_API_URL } from './constants'
import { wikimediaRequest, JSON_API_TIMEOUT_MS } from './wikimediaHttp'

type WbEntityClaim = {
  mainsnak?: {
    snaktype?: string
    datavalue?: { value?: unknown }
  }
}

type WbEntity = {
  id?: string
  labels?: Record<string, { language: string; value: string }>
  descriptions?: Record<string, { language: string; value: string }>
  sitelinks?: Record<string, { site: string; title: string }>
  claims?: Record<string, WbEntityClaim[]>
}

type WbGetEntitiesResponse = {
  entities?: Record<string, WbEntity>
}

type WbSearchEntitiesResponse = {
  search?: Array<{ id?: string; label?: string }>
}

export interface WikidataEntitySnapshot {
  id: string
  label?: string
  description?: string
  wikipediaTitle?: string
  imageUrl?: string
  instanceOfIds: string[]
  subclassOfIds: string[]
}

const ENTITY_FETCH_BATCH_SIZE = 50
const ENTITY_SNAPSHOT_CACHE_TTL_MS = 1000 * 60 * 20
const ENTITY_SNAPSHOT_CACHE_MAX_SIZE = 400

type EntitySnapshotCacheEntry = {
  value: WikidataEntitySnapshot | null
  expiresAt: number
}

const entitySnapshotCache = new Map<string, EntitySnapshotCacheEntry>()

function nowMs(): number {
  return Date.now()
}

function getCachedSnapshot(id: string): WikidataEntitySnapshot | null | undefined {
  const entry = entitySnapshotCache.get(id)
  if (!entry) return undefined
  if (entry.expiresAt <= nowMs()) {
    entitySnapshotCache.delete(id)
    return undefined
  }
  // LRU touch: most recently used entries move to map tail.
  entitySnapshotCache.delete(id)
  entitySnapshotCache.set(id, entry)
  return entry.value
}

function setCachedSnapshot(id: string, value: WikidataEntitySnapshot | null): void {
  entitySnapshotCache.set(id, {
    value,
    expiresAt: nowMs() + ENTITY_SNAPSHOT_CACHE_TTL_MS,
  })
  while (entitySnapshotCache.size > ENTITY_SNAPSHOT_CACHE_MAX_SIZE) {
    const oldestKey = entitySnapshotCache.keys().next().value as string | undefined
    if (!oldestKey) break
    entitySnapshotCache.delete(oldestKey)
  }
}

function toQid(value: string | undefined): string | null {
  if (!value) return null
  const qid = value.trim().toUpperCase()
  return /^Q[1-9]\d*$/.test(qid) ? qid : null
}

function claimEntityIds(entity: WbEntity | undefined, property: string): string[] {
  const claims = entity?.claims?.[property]
  if (!Array.isArray(claims)) return []
  const ids = claims
    .map((claim) => {
      if (claim?.mainsnak?.snaktype !== 'value') return null
      const value = claim.mainsnak.datavalue?.value
      if (!value || typeof value !== 'object') return null
      const id = (value as { id?: string }).id
      return toQid(id)
    })
    .filter((id): id is string => Boolean(id))
  return [...new Set(ids)]
}

function claimCommonsImage(entity: WbEntity | undefined): string | undefined {
  const claims = entity?.claims?.P18
  if (!Array.isArray(claims)) return undefined
  for (const claim of claims) {
    if (claim?.mainsnak?.snaktype !== 'value') continue
    const value = claim.mainsnak.datavalue?.value
    if (typeof value !== 'string' || !value.trim()) continue
    const fileName = value.trim().replaceAll(' ', '_')
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
  }
  return undefined
}

function parseSnapshot(entity: WbEntity | undefined, fallbackId: string): WikidataEntitySnapshot | null {
  const id = toQid(entity?.id) ?? toQid(fallbackId)
  if (!id) return null
  return {
    id,
    label: entity?.labels?.en?.value?.trim() || undefined,
    description: entity?.descriptions?.en?.value?.trim() || undefined,
    wikipediaTitle: entity?.sitelinks?.enwiki?.title?.trim() || undefined,
    imageUrl: claimCommonsImage(entity),
    instanceOfIds: claimEntityIds(entity, 'P31'),
    subclassOfIds: claimEntityIds(entity, 'P279'),
  }
}

async function fetchWikidataEntityBatch(
  ids: string[],
  signal?: AbortSignal
): Promise<Map<string, WikidataEntitySnapshot>> {
  const snapshots = new Map<string, WikidataEntitySnapshot>()
  if (ids.length === 0) return snapshots

  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels|descriptions|claims|sitelinks',
    languages: 'en',
    sitefilter: 'enwiki',
    format: 'json',
    origin: '*',
  })
  const url = `${WIKIDATA_ACTION_API_URL}?${params.toString()}`
  const res = await wikimediaRequest(
    url,
    { signal, headers: { accept: 'application/json' } },
    JSON_API_TIMEOUT_MS
  )
  if (!res.ok) return snapshots

  const json = (await res.json()) as WbGetEntitiesResponse
  for (const requestedId of ids) {
    const entity = json.entities?.[requestedId]
    const snapshot = parseSnapshot(entity, requestedId)
    if (snapshot) snapshots.set(snapshot.id, snapshot)
  }
  return snapshots
}

/**
 * Short English description from Wikidata (not the full Wikipedia article).
 * Used when no English Wikipedia summary is available.
 */
export async function fetchWikidataEnglishDescription(
  qid: string,
  signal?: AbortSignal
): Promise<string | undefined> {
  const id = toQid(qid)
  if (!id) return undefined

  const cached = getCachedSnapshot(id)
  if (cached?.description) return cached.description

  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: id,
    props: 'descriptions',
    languages: 'en',
    format: 'json',
    origin: '*',
  })
  const url = `${WIKIDATA_ACTION_API_URL}?${params.toString()}`

  try {
    const res = await wikimediaRequest(
      url,
      { signal, headers: { accept: 'application/json' } },
      JSON_API_TIMEOUT_MS
    )
    if (!res.ok) return undefined
    const json = (await res.json()) as WbGetEntitiesResponse
    const desc = json.entities?.[id]?.descriptions?.en?.value
    const normalized = desc?.trim() || undefined
    if (normalized) {
      setCachedSnapshot(id, {
        id,
        label: cached?.label,
        description: normalized,
        wikipediaTitle: cached?.wikipediaTitle,
        imageUrl: cached?.imageUrl,
        instanceOfIds: cached?.instanceOfIds ?? [],
        subclassOfIds: cached?.subclassOfIds ?? [],
      })
    }
    return normalized
  } catch {
    return undefined
  }
}

/**
 * Fast candidate search from the Wikidata Action API.
 * Returns Q-ids only; caller can enrich/filter via SPARQL with VALUES.
 */
export async function searchWikidataEntityIds(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<string[]> {
  const q = query.trim()
  if (!q) return []
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: q,
    language: 'en',
    type: 'item',
    limit: String(Math.min(Math.max(limit, 1), 50)),
    format: 'json',
    origin: '*',
  })
  const url = `${WIKIDATA_ACTION_API_URL}?${params.toString()}`
  try {
    const res = await wikimediaRequest(
      url,
      { signal, headers: { accept: 'application/json' } },
      JSON_API_TIMEOUT_MS
    )
    if (!res.ok) return []
    const json = (await res.json()) as WbSearchEntitiesResponse
    return (json.search ?? [])
      .map((row) => row.id?.trim().toUpperCase() ?? '')
      .filter((id) => /^Q[1-9]\d*$/.test(id))
  } catch {
    return []
  }
}

/**
 * Fetch and parse item snapshots from Wikidata Action API (wbgetentities).
 * Uses an in-memory cache to avoid repeated roundtrips across searches.
 */
export async function fetchWikidataEntitySnapshots(
  ids: string[],
  signal?: AbortSignal
): Promise<Map<string, WikidataEntitySnapshot>> {
  const normalized = [...new Set(ids.map(toQid).filter((id): id is string => Boolean(id)))]
  const result = new Map<string, WikidataEntitySnapshot>()
  if (normalized.length === 0) return result

  const missing: string[] = []
  for (const id of normalized) {
    const cached = getCachedSnapshot(id)
    if (cached) {
      result.set(id, cached)
    } else if (cached === null) {
      // Previously not found; keep as missing in result.
    } else {
      missing.push(id)
    }
  }

  for (let i = 0; i < missing.length; i += ENTITY_FETCH_BATCH_SIZE) {
    const batch = missing.slice(i, i + ENTITY_FETCH_BATCH_SIZE)
    try {
      const batchSnapshots = await fetchWikidataEntityBatch(batch, signal)
      for (const id of batch) {
        const snapshot = batchSnapshots.get(id) ?? null
        setCachedSnapshot(id, snapshot)
        if (snapshot) result.set(id, snapshot)
      }
    } catch {
      // Keep partial success from previous batches; caller handles degraded results.
    }
  }

  return result
}
