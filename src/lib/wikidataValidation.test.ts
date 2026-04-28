import { describe, it, expect } from 'vitest'
import {
  MIN_INSTRUMENT_SEARCH_LENGTH,
  isValidWikidataItemId,
  normalizeInstrumentSearchQuery,
  canRunInstrumentSearch,
} from '@/lib/wikidataValidation'

describe('isValidWikidataItemId', () => {
  it('accepts valid Q ids', () => {
    expect(isValidWikidataItemId('Q5')).toBe(true)
    expect(isValidWikidataItemId('Q5994')).toBe(true)
    expect(isValidWikidataItemId('  Q42  ')).toBe(true)
    expect(isValidWikidataItemId('q5')).toBe(true)
  })

  it('rejects invalid shapes', () => {
    expect(isValidWikidataItemId('')).toBe(false)
    expect(isValidWikidataItemId('Q')).toBe(false)
    expect(isValidWikidataItemId('Q0')).toBe(false)
    expect(isValidWikidataItemId('Q01')).toBe(false)
    expect(isValidWikidataItemId('P31')).toBe(false)
  })
})

describe('normalizeInstrumentSearchQuery', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeInstrumentSearchQuery('  a  b  ')).toBe('a b')
  })

  it('returns empty for control characters', () => {
    expect(normalizeInstrumentSearchQuery('bad\u0007')).toBe('')
  })

  it('caps length', () => {
    const long = 'x'.repeat(200)
    expect(normalizeInstrumentSearchQuery(long).length).toBe(120)
  })
})

describe('canRunInstrumentSearch', () => {
  it(`requires at least ${MIN_INSTRUMENT_SEARCH_LENGTH} characters after normalize`, () => {
    expect(canRunInstrumentSearch('a')).toBe(false)
    expect(canRunInstrumentSearch('ab')).toBe(true)
  })
})
