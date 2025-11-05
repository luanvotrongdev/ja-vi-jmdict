const MAZII_ENDPOINT = 'https://mazii.net/api/search'

export const MAZII_KANJI_ENDPOINT = `${MAZII_ENDPOINT}/kanji`
export const MAZII_WORD_ENDPOINT = `${MAZII_ENDPOINT}/word`

export interface MaziiSearchRequest {
  /**
   * Dictionary to search against. Defaults to `'javi'` which returns Japanese → Vietnamese results.
   */
  dict: string
  /**
   * Search type. For kanji lookups Mazii expects `'kanji'`.
   */
  type?: string
  /**
   * The kanji or reading to search for.
   */
  query: string
  /**
   * The limit to search for.
   */
  limit: number
  /**
   * 1-based page index.
   */
  page?: number
}

export interface MaziiExampleEntry {
  /**
   * Term/phrase associated with the example.
   */
  w: string
  /**
   * Meaning/translation of the term.
   */
  m: string
  /**
   * Pronunciation information.
   */
  p: string
  /**
   * Optional helper reading (present in some payloads).
   */
  h?: string
}

export type MaziiExampleGroups = Record<string, MaziiExampleEntry[]>

export interface MaziiTipsPayload {
  /**
   * Vietnamese tip/description. Mazii may include other languages as additional keys.
   */
  vi?: string
  [key: string]: string | undefined
}

export interface MaziiCompositionNode {
  id: string
  word: string
}

export interface MaziiCompositionLink {
  source: string
  target: string
}

export interface MaziiCompositionGraph {
  nodes: MaziiCompositionNode[]
  links: MaziiCompositionLink[]
}

export interface MaziiCompositionDetail {
  w: string
  h: string
}

export interface MaziiKanjiResult {
  kanji: string
  mean?: string
  detail?: string
  kun?: string
  on?: string
  tips?: MaziiTipsPayload
  level?: string[]
  example_kun?: MaziiExampleGroups
  example_on?: MaziiExampleGroups
  examples?: MaziiExampleEntry[]
  comp_graph?: MaziiCompositionGraph
  compDetail?: MaziiCompositionDetail[]
  image?: string | null
  mobileId?: number
  freq?: number
  writing?: string | null
  stroke_count?: string | number | null
  label?: string
  /**
   * Mazii sometimes sends additional dynamic properties; retain them without sacrificing type safety.
   */
  [key: string]: unknown
}

export interface MaziiKanjiSearchResponse {
  status: number
  results: MaziiKanjiResult[]
  total: number
}
