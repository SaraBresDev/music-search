export interface InstrumentSearchResult {
  /** Wikidata entity id, e.g. "Q34379" */
  id: string
  name: string
  imageUrl?: string
  wikipediaTitle?: string
}

export interface InstrumentDetail {
  id: string
  name: string
  imageUrl?: string
  description?: string
  wikipediaTitle?: string
}

/** Notable musician linked to an instrument (Wikidata: instrument played, P1303) */
export interface NotablePlayer {
  id: string
  name: string
  imageUrl?: string
}
