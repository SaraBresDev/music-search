import { WIKIPEDIA_SUMMARY_BASE } from './constants'
import { wikimediaRequest, WIKIPEDIA_TIMEOUT_MS } from './wikimediaHttp'

export async function fetchWikipediaExtract(
  title?: string,
  signal?: AbortSignal
): Promise<string | undefined> {
  if (!title) return undefined
  const url = `${WIKIPEDIA_SUMMARY_BASE}/${encodeURIComponent(title)}`
  try {
    const res = await wikimediaRequest(
      url,
      { signal, headers: { accept: 'application/json' } },
      WIKIPEDIA_TIMEOUT_MS
    )
    if (!res.ok) return undefined
    const json = (await res.json()) as { extract?: string }
    return typeof json.extract === 'string' ? json.extract : undefined
  } catch {
    return undefined
  }
}
