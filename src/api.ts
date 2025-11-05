import {
  type MaziiKanjiResult,
  type MaziiSearchRequest,
  type MaziiKanjiSearchResponse,
  MAZII_KANJI_ENDPOINT,
  MAZII_HEADERS
} from '../schemas/api.ts'


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

export async function searchMaziiKanji(kanji: string): Promise<MaziiKanjiResult[]> {
  const response = await fetch(MAZII_KANJI_ENDPOINT, {
    method: 'POST',
    headers: MAZII_HEADERS,
    body: JSON.stringify({
        dict: "javi",
        type: "kanji",
        query: kanji,
        limit: 1,
        page: 1
    } as MaziiSearchRequest),
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
