import { WIKIDATA_ACTION_API_URL } from './constants'
import { wikimediaRequest, JSON_API_TIMEOUT_MS } from './wikimediaHttp'

type WbGetEntitiesResponse = {
  entities?: Record<
    string,
    { descriptions?: Record<string, { language: string; value: string }> }
  >
}

/**
 * Short English description from Wikidata (not the full Wikipedia article).
 * Used when no English Wikipedia summary is available.
 */
export async function fetchWikidataEnglishDescription(
  qid: string
): Promise<string | undefined> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: qid,
    props: 'descriptions',
    languages: 'en',
    format: 'json',
    origin: '*',
  })
  const url = `${WIKIDATA_ACTION_API_URL}?${params.toString()}`

  try {
    const res = await wikimediaRequest(
      url,
      { headers: { accept: 'application/json' } },
      JSON_API_TIMEOUT_MS
    )
    if (!res.ok) return undefined
    const json = (await res.json()) as WbGetEntitiesResponse
    const desc = json.entities?.[qid]?.descriptions?.en?.value
    return desc?.trim() || undefined
  } catch {
    return undefined
  }
}
