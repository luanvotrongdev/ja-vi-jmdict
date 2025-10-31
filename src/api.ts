import type {
  MaziiKanjiResult,
  MaziiKanjiSearchRequest,
  MaziiKanjiSearchResponse,
} from '../schemas/api.ts'

const MAZII_KANJI_ENDPOINT = 'https://mazii.net/api/search/kanji'

export interface SearchKanjiOptions {
  /**
   * Dictionary key supported by Mazii. Defaults to `'javi'` (Japanese → Vietnamese).
   */
  dict?: string
  /**
   * Page number (1-indexed) Mazii should return.
   */
  page?: number
}

function buildRequestPayload(
  query: string,
  { dict, page }: SearchKanjiOptions,
): MaziiKanjiSearchRequest {
  return {
    dict: dict ?? 'javi',
    type: 'kanji',
    query,
    page: page ?? 1,
  }
}

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
  query: string,
  options: SearchKanjiOptions = {},
): Promise<MaziiKanjiResult[]> {
  if (!query.trim()) {
    throw new Error('Mazii kanji search requires a non-empty query')
  }

  const payload = buildRequestPayload(query, options)

  const response = await fetch(MAZII_KANJI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
