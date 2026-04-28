/**
 * Minimum characters before we call Wikidata search.
 * Keep in sync with `instrumentSearchOptions` (`enabled`) and `SearchForm` submit gate.
 */
export const MIN_INSTRUMENT_SEARCH_LENGTH = 2

/** Wikidata item id: Q followed by digits, no leading zeros */
export function isValidWikidataItemId(raw: string): boolean {
  return /^Q[1-9]\d*$/i.test(raw.trim())
}

function hasAsciiControlChars(s: string): boolean {
  for (const ch of s) {
    const c = ch.codePointAt(0)!
    if (c < 0x20 || c === 0x7f) return true
  }
  return false
}

/**
 * Normalizes user search text: trim, collapse spaces, cap length.
 * Returns empty string if input is unsafe (control characters).
 */
export function normalizeInstrumentSearchQuery(raw: string): string {
  const q = raw.trim().replace(/\s+/g, ' ')
  if (!q || hasAsciiControlChars(q)) return ''
  return q.length > 120 ? q.slice(0, 120) : q
}

/** True when the normalized query is long enough to run `searchInstruments`. */
export function canRunInstrumentSearch(raw: string): boolean {
  return normalizeInstrumentSearchQuery(raw).length >= MIN_INSTRUMENT_SEARCH_LENGTH
}
