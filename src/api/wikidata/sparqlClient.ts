import { WIKIDATA_SPARQL_URL } from './constants'
import {
  WikimediaHttpError,
  wikimediaRequestOk,
  SPARQL_TIMEOUT_MS,
} from './wikimediaHttp'

export type SparqlBinding = Record<string, { type: string; value: string }>

type SparqlResultsJson = {
  results?: { bindings?: SparqlBinding[] }
}

function assertSparqlResults(
  data: unknown,
  url: string,
  httpStatus: number
): SparqlResultsJson {
  if (!data || typeof data !== 'object') {
    throw new WikimediaHttpError('SPARQL response is not a JSON object', httpStatus, url)
  }
  const results = (data as SparqlResultsJson).results
  if (results == null || typeof results !== 'object') {
    throw new WikimediaHttpError('SPARQL response missing results', httpStatus, url)
  }
  const bindings = results.bindings
  if (!Array.isArray(bindings)) {
    throw new WikimediaHttpError(
      'SPARQL results.bindings is not an array',
      httpStatus,
      url
    )
  }
  return data as SparqlResultsJson
}

export async function fetchSparql(query: string, signal?: AbortSignal): Promise<{
  results: { bindings: SparqlBinding[] }
}> {
  const url = `${WIKIDATA_SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`
  const res = await wikimediaRequestOk(
    url,
    {
      method: 'GET',
      signal,
      headers: { accept: 'application/sparql-results+json' },
    },
    SPARQL_TIMEOUT_MS
  )
  let raw: unknown
  try {
    raw = await res.json()
  } catch {
    throw new WikimediaHttpError('SPARQL response is not valid JSON', res.status, url)
  }
  const parsed = assertSparqlResults(raw, url, res.status)
  return {
    results: { bindings: parsed.results!.bindings! },
  }
}

export function qidFromEntityUrl(entityUrl: string): string {
  const m = entityUrl.match(/\/(Q\d+)$/i)
  return m?.[1] ?? entityUrl
}

export function bindingString(b: SparqlBinding, key: string): string | undefined {
  return b[key]?.value
}
