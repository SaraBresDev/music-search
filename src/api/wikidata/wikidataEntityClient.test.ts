import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWikidataEntitySnapshots } from './wikidataEntityClient'
import * as http from './wikimediaHttp'

vi.mock('./wikimediaHttp', async () => {
  const actual = await vi.importActual<typeof import('./wikimediaHttp')>('./wikimediaHttp')
  return {
    ...actual,
    wikimediaRequest: vi.fn(),
  }
})

function okJson(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response
}

describe('fetchWikidataEntitySnapshots cache policy', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    vi.mocked(http.wikimediaRequest).mockReset()
  })

  it('serves cached entries before TTL and refetches after TTL', async () => {
    vi.mocked(http.wikimediaRequest).mockResolvedValue(
      okJson({
        entities: {
          Q5994: {
            id: 'Q5994',
            labels: { en: { language: 'en', value: 'Piano' } },
            claims: {},
            sitelinks: {},
          },
        },
      })
    )

    await fetchWikidataEntitySnapshots(['Q5994'])
    expect(http.wikimediaRequest).toHaveBeenCalledTimes(1)

    await fetchWikidataEntitySnapshots(['Q5994'])
    expect(http.wikimediaRequest).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-01-01T00:21:00.000Z'))
    await fetchWikidataEntitySnapshots(['Q5994'])
    expect(http.wikimediaRequest).toHaveBeenCalledTimes(2)
  })
})
