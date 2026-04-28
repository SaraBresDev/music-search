export const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql'

/** Wikidata MediaWiki Action API (wbgetentities, etc.) */
export const WIKIDATA_ACTION_API_URL = 'https://www.wikidata.org/w/api.php'

export const WIKIPEDIA_SUMMARY_BASE =
  'https://en.wikipedia.org/api/rest_v1/page/summary'

/** Wikidata: musical instrument */
export const WD_MUSICAL_INSTRUMENT = 'wd:Q34379'

/**
 * Exclude typical false positives in instrument search (2-letter prefix matches
 * "adobe…", humans mis-tagged, software with odd P31 chains).
 * Lines are injected into SPARQL after the instrument constraint.
 */
export const SPARQL_EXCLUDE_NON_INSTRUMENT_ITEMS = `
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q7397 . }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q20094068 . }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q5 . }
`.trim()

/** Identifies this app to Wikimedia APIs (recommended by their policy) */
export const WIKIMEDIA_USER_AGENT = 'music-search-home-assignment/1.0 (educational)'
