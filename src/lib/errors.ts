import { WikimediaHttpError } from '@/api/wikidata/wikimediaHttp'

function isDomException(e: unknown): e is DOMException {
  return e instanceof DOMException
}

/**
 * User-facing copy for thrown values from fetch, Wikimedia clients, and generic Errors.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (isDomException(error)) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return 'The request took too long or was cancelled. Check your connection and try again.'
    }
  }

  if (error instanceof WikimediaHttpError) {
    if (error.status === 404 || error.status === 410) {
      return 'Nothing was found for this request.'
    }
    if (error.status >= 500) {
      return 'The data service had a problem. Please try again in a moment.'
    }
    if (error.status >= 400) {
      return error.message || fallback
    }
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}
