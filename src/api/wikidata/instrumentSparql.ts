/**
 * SPARQL query text for the instrument feature.
 * Escape user search text with `sparqlEscapeDoubleQuoted` before embedding.
 * Validate Wikidata Q-ids (`isValidWikidataItemId`) before embedding in detail/player queries.
 */
import { SPARQL_EXCLUDE_NON_INSTRUMENT_ITEMS, WD_MUSICAL_INSTRUMENT } from './constants'

export function sparqlEscapeDoubleQuoted(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

/** Must be true for any row we return (instance or class under musical instrument). */
const SPARQL_IS_MUSICAL_INSTRUMENT = `
  FILTER(
    EXISTS { ?item wdt:P31/wdt:P279* ${WD_MUSICAL_INSTRUMENT} . } ||
    EXISTS { ?item wdt:P279* ${WD_MUSICAL_INSTRUMENT} . }
  )
`.trim()

/** Bind ?item to a musical-instrument item or class (for label substring scans). */
const SPARQL_INSTRUMENT_ITEM_OR_CLASS = `
  {
    ?item wdt:P31/wdt:P279* ${WD_MUSICAL_INSTRUMENT} .
  } UNION {
    ?item wdt:P279* ${WD_MUSICAL_INSTRUMENT} .
  }
`.trim()

const ENTITY_SEARCH_MWAPI_LIMIT = 40
const SEARCH_RESULTS_LIMIT = 24
const NOTABLE_PLAYERS_LIMIT = 3

/**
 * Wikidata EntitySearch (mwapi) returns candidate items; we then filter to instruments only.
 */
export function sparqlInstrumentSearchEntitySearch(searchTermEscaped: string): string {
  return `
SELECT ?item ?itemLabel ?image WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
    bd:serviceParam wikibase:api "EntitySearch" .
    bd:serviceParam mwapi:search "${searchTermEscaped}" .
    bd:serviceParam mwapi:language "en" .
    bd:serviceParam mwapi:limit "${ENTITY_SEARCH_MWAPI_LIMIT}" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  ${SPARQL_IS_MUSICAL_INSTRUMENT}
  ${SPARQL_EXCLUDE_NON_INSTRUMENT_ITEMS}
  OPTIONAL { ?item wdt:P18 ?image . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${SEARCH_RESULTS_LIMIT}
`.trim()
}

/**
 * English label substring match on instrument items/classes (e.g. "ia" → "piano").
 */
export function sparqlInstrumentSearchLabelSubstring(needleEscaped: string): string {
  return `
SELECT ?item ?itemLabel ?image WHERE {
  ${SPARQL_INSTRUMENT_ITEM_OR_CLASS}
  ${SPARQL_EXCLUDE_NON_INSTRUMENT_ITEMS}
  ?item rdfs:label ?itemLabel .
  FILTER(LANG(?itemLabel) = "en") .
  FILTER(CONTAINS(LCASE(STR(?itemLabel)), LCASE("${needleEscaped}"))) .
  OPTIONAL { ?item wdt:P18 ?image . }
}
ORDER BY ASC(STRLEN(STR(?itemLabel))) ASC(?itemLabel)
LIMIT ${SEARCH_RESULTS_LIMIT}
`.trim()
}

/** Single instrument: label, image, English Wikipedia sitelink title. */
export function sparqlInstrumentDetail(instrumentQid: string): string {
  return `
PREFIX schema: <http://schema.org/>
SELECT ?item ?itemLabel ?image ?wikipediaTitle WHERE {
  BIND(wd:${instrumentQid} AS ?item)
  OPTIONAL { ?item wdt:P18 ?image . }
  OPTIONAL {
    ?article schema:about ?item ;
             schema:isPartOf <https://en.wikipedia.org/> ;
             schema:name ?wikipediaTitle .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 1
`.trim()
}

/** Humans (Q5) with P1303 pointing at this instrument. */
export function sparqlNotablePlayersForInstrument(instrumentQid: string): string {
  return `
SELECT ?person ?personLabel ?image WHERE {
  ?person wdt:P1303 wd:${instrumentQid} .
  ?person wdt:P31 wd:Q5 .
  OPTIONAL { ?person wdt:P18 ?image . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${NOTABLE_PLAYERS_LIMIT}
`.trim()
}
