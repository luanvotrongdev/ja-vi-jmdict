import type {
  MaziiKanjiResult,
  MaziiKanjiSearchRequest,
  MaziiKanjiSearchResponse,
} from '../schemas/api.ts'

const MAZII_KANJI_ENDPOINT = 'https://mazii.net/api/search/kanji'

function assertResponseShape(payload: unknown): asserts payload is MaziiKanjiSearchResponse {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as MaziiKanjiSearchResponse).status !== 'number' ||
    !Array.isArray((payload as MaziiKanjiSearchResponse).results) ||
    typeof (payload as MaziiKanjiSearchResponse).total !== 'number'
  ) {
    throw new Error('Mazii kanji search response is missing expected fields')
  }
}

export async function searchKanji(
  payload: MaziiKanjiSearchRequest
): Promise<MaziiKanjiResult[]> {
  if (!payload) {
    throw new Error('Mazii kanji search requires a non-empty query')
  }


  const response = await fetch(MAZII_KANJI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Mazii kanji search failed with status ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText}` : ''
      }`,
    )
  }

  const json = (await response.json()) as unknown

  assertResponseShape(json)

  return json.results
}
