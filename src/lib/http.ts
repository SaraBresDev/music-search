/** Timeouts keep the UI responsive when upstream APIs throttle or hang */
const SPARQL_TIMEOUT_MS = 25_000
const JSON_API_TIMEOUT_MS = 20_000

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = JSON_API_TIMEOUT_MS
): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
  })
}

export const WIKIPEDIA_TIMEOUT_MS = 15_000

export { SPARQL_TIMEOUT_MS, JSON_API_TIMEOUT_MS }
