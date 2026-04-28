import {
  fetchWithTimeout,
  JSON_API_TIMEOUT_MS,
  SPARQL_TIMEOUT_MS,
  WIKIPEDIA_TIMEOUT_MS,
} from '@/lib/http'
import { WIKIMEDIA_USER_AGENT } from './constants'

export { JSON_API_TIMEOUT_MS, SPARQL_TIMEOUT_MS, WIKIPEDIA_TIMEOUT_MS }

/** Thrown when a Wikimedia HTTP response has a non-OK status (used by SPARQL and strict JSON callers). */
export class WikimediaHttpError extends Error {
  readonly status: number
  readonly url: string

  constructor(message: string, status: number, url: string) {
    super(message)
    this.name = 'WikimediaHttpError'
    this.status = status
    this.url = url
  }
}

function withDefaultUserAgent(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers)
  if (!headers.has('user-agent')) {
    headers.set('user-agent', WIKIMEDIA_USER_AGENT)
  }
  return { ...init, headers }
}

/**
 * GET/POST to Wikimedia endpoints with policy User-Agent and timeout.
 * Does not throw on HTTP error status — check `response.ok`.
 */
export async function wikimediaRequest(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = JSON_API_TIMEOUT_MS
): Promise<Response> {
  return fetchWithTimeout(url, withDefaultUserAgent(init), timeoutMs)
}

/**
 * Same as {@link wikimediaRequest}, but throws {@link WikimediaHttpError} when `!response.ok`.
 */
export async function wikimediaRequestOk(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = JSON_API_TIMEOUT_MS
): Promise<Response> {
  const res = await wikimediaRequest(url, init, timeoutMs)
  if (!res.ok) {
    throw new WikimediaHttpError(
      `HTTP ${res.status} ${res.statusText}`.trim(),
      res.status,
      url
    )
  }
  return res
}

export async function wikimediaJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = JSON_API_TIMEOUT_MS
): Promise<T> {
  const res = await wikimediaRequestOk(url, init, timeoutMs)
  try {
    return (await res.json()) as T
  } catch {
    throw new WikimediaHttpError('Response body is not valid JSON', res.status, url)
  }
}
