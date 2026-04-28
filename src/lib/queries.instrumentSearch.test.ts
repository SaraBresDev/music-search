import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { instrumentSearchOptions } from '@/lib/queries'
import * as api from '@/api/wikidata'

vi.mock('@/api/wikidata', async () => {
  const actual = await vi.importActual<typeof import('@/api/wikidata')>('@/api/wikidata')
  return {
    ...actual,
    searchInstruments: vi.fn(),
  }
})

describe('instrumentSearchOptions', () => {
  beforeEach(() => {
    vi.mocked(api.searchInstruments).mockReset()
  })

  it('runs queryFn against the repository', async () => {
    vi.mocked(api.searchInstruments).mockResolvedValue([
      { id: 'Q5994', name: 'Piano', imageUrl: undefined, wikipediaTitle: undefined },
    ])

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const data = await client.fetchQuery(instrumentSearchOptions('piano'))

    expect(api.searchInstruments).toHaveBeenCalledWith('piano')
    expect(data).toHaveLength(1)
    expect(data[0]?.id).toBe('Q5994')
  })

  it('normalizes query before keying and fetching', async () => {
    vi.mocked(api.searchInstruments).mockResolvedValue([])
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const options = instrumentSearchOptions('   pi   ano   ')

    expect(options.queryKey).toEqual(['instruments', 'pi ano'])
    await client.fetchQuery(options)

    expect(api.searchInstruments).toHaveBeenCalledWith('pi ano')
  })
})
