import { describe, expect, it } from 'vitest'
import { sparqlNotablePlayersForInstrument } from './instrumentSparql'

describe('sparqlNotablePlayersForInstrument', () => {
  it('orders top players deterministically', () => {
    const query = sparqlNotablePlayersForInstrument('Q5994')

    expect(query).toContain('ORDER BY DESC(BOUND(?image)) ASC(?personLabel) ASC(?person)')
    expect(query).toContain('LIMIT 3')
  })
})
