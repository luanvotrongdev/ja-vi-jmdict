// Turns the raw Mazii + Jisho crawl JSON into clean, structured entries that
// exporters can render. Kept separate from rendering so other exporters
// (e.g. yomitan.ts) can reuse it.
import type { JishoAPIResult, JishoResult, KanjiParseResult } from 'unofficial-jisho-api'
import type { MaziiKanjiResult, MaziiWordResult, MaziiWordSearchPayload } from '../schemas/api'

export interface WordForms {
  kanji: string[]    // JMdict k_ele, in order
  readings: string[] // JMdict r_ele, in order
}

export interface Example {
  japanese: string
  vietnamese: string
}

export interface VietnameseSense {
  meaning: string
  examples: Example[]
}

export interface EnglishSense {
  partsOfSpeech: string[]
  definitions: string[]
  notes: string[]
}

export interface WordEntry {
  headword: string
  otherWritings: string[]
  readings: string[]
  pitchAccent: number | null
  jlpt: string | null
  common: boolean
  wordTypes: string[] // Vietnamese labels, from Mazii
  vietnamese: VietnameseSense[]
  english: EnglishSense[]
  keys: string[]      // every form a reader may look up
}

export interface KanjiExample {
  word: string
  reading: string
  hanViet: string
  meaning: string
}

export interface KanjiEntry {
  kanji: string
  hanViet: string | null
  vietnamese: string | null
  english: string | null
  onyomi: string[]
  kunyomi: string[]
  jlpt: string | null
  strokes: number | null
  radical: string | null
  components: { kanji: string, hanViet: string }[]
  tip: string | null
  examples: KanjiExample[]
}

const MAX_EXAMPLES_PER_SENSE = 2
const MAX_KANJI_EXAMPLES = 4

// JMdict part-of-speech / usage codes (as returned by Mazii) -> Vietnamese labels.
const KIND_LABELS: Record<string, string> = {
  'n': 'danh từ', 'n-adv': 'danh từ làm phó từ', 'n-t': 'danh từ chỉ thời gian',
  'n-suf': 'hậu tố danh từ', 'n-pref': 'tiền tố danh từ', 'n-pr': 'danh từ riêng',
  'vs': 'danh từ + する', 'vs-i': 'động từ nhóm 3', 'vs-s': 'động từ nhóm 3', 'vs-c': 'động từ nhóm 3',
  'vk': 'động từ nhóm 3', 'vz': 'động từ nhóm 3', 'vn': 'động từ bất quy tắc',
  'v1': 'động từ nhóm 2', 'v': 'động từ', 'aux-v': 'trợ động từ',
  'vt': 'tha động từ', 'vi': 'tự động từ',
  'adj-i': 'tính từ đuôi い', 'adj-ix': 'tính từ đuôi い', 'adj-na': 'tính từ đuôi な',
  'adj-no': 'danh từ + の', 'adj-pn': 'liên thể từ', 'adj-t': 'tính từ đuôi たる',
  'adj-f': 'định ngữ', 'adj': 'tính từ', 'aux-adj': 'tính từ phụ trợ',
  'adj-ku': 'tính từ cổ', 'adj-nari': 'tính từ cổ',
  'adv': 'phó từ', 'adv-to': 'phó từ đuôi と', 'adv-n': 'phó từ',
  'exp': 'cụm từ', 'id': 'thành ngữ', 'int': 'thán từ', 'conj': 'liên từ',
  'prt': 'trợ từ', 'aux': 'trợ từ', 'cop': 'hệ từ', 'pn': 'đại từ', 'num': 'số từ',
  'ctr': 'trợ số từ', 'pref': 'tiền tố', 'suf': 'hậu tố',
  'abbr': 'viết tắt', 'uk': 'thường viết bằng kana', 'sl': 'tiếng lóng', 'col': 'khẩu ngữ',
  'fam': 'thân mật', 'hon': 'tôn kính ngữ', 'hum': 'khiêm nhường ngữ', 'pol': 'lịch sự',
  'derog': 'miệt thị', 'arch': 'cổ ngữ', 'obs': 'lỗi thời', 'fig': 'nghĩa bóng',
  'gram': 'ngữ pháp', 'ksb': 'phương ngữ Kansai', 'osk': 'phương ngữ Osaka', 'iK': 'kanji bất quy tắc',
}

function kindLabel(code: string): string | null {
  const c = code.trim()
  if (!c) return null
  if (KIND_LABELS[c]) return KIND_LABELS[c]!
  if (/^v5/.test(c)) return 'động từ nhóm 1'
  if (/^v[24]/.test(c)) return 'động từ cổ'
  // Mazii sometimes already gives a readable label ("danh từ", "noun phrase").
  return /\p{L}{3,}/u.test(c) && !/^[a-z]+(-[a-z]+)*$/.test(c) ? c : null
}

// Drops values with no letters or digits ("*", "_") and trims trailing whitespace.
function meaningful(text: string | null | undefined): text is string {
  return typeof text === 'string' && /[\p{L}\p{N}]/u.test(text)
}

// Trims and removes the stray space Mazii leaves before punctuation ("Mèo con .").
function tidy(text: string): string {
  return text.trim().replace(/\s+([.,;:!?])/g, '$1')
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

function uniqueCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter(v => {
    const k = v.trim().toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// Mazii accent strings look like "LHL-L": one L/H per mora, then the particle.
// Returns the standard downstep number: 0 = heiban, n = drop after mora n.
export function pitchAccentNumber(accent: string | undefined): number | null {
  if (!accent) return null
  const [word, particle] = accent.split('-')
  if (!word || !/^[LH]+$/.test(word)) return null
  if (word[0] === 'H') return word.length > 1 && word[1] === 'H' ? null : 1
  const lastHigh = word.lastIndexOf('H')
  if (lastHigh < 0) return particle === 'H' ? 0 : null // one-mora heiban: "L-H"
  if (lastHigh === word.length - 1 && particle !== 'L') return 0
  return lastHigh + 1
}

// Mazii and Jisho sometimes return a different word than the one crawled
// (e.g. 阿 for 阿る), so only use a result for the crawled headword.
// The crawl searched the headword (first kanji form, else first reading).
function pickMaziiWord(payload: MaziiWordSearchPayload | undefined, headword: string, forms: WordForms): MaziiWordResult | null {
  const candidates = payload?.words?.filter(w => w.word === headword) ?? []
  return candidates.find(w => forms.readings.includes(w.phonetic?.trim())) ?? candidates[0] ?? null
}

// When several Jisho results share the headword (食 "food" vs 食 "eclipse"),
// pick the one sharing the most spellings and readings with the JMdict entry.
// Also says whether that pick is the top Jisho result for the headword: Mazii
// only returns the most common sense, so it is wrong for the other entries.
function pickJishoWord(result: JishoAPIResult | undefined, headword: string, forms: Set<string>): { word: JishoResult | null, isTopResult: boolean } {
  let best: JishoResult | null = null
  let bestScore = 0
  let first: JishoResult | null = null
  for (const d of result?.data ?? []) {
    const spellings = new Set(d.japanese.flatMap(j => [j.word, j.reading]).filter((s): s is string => !!s))
    if (!spellings.has(headword)) continue
    first ??= d
    const score = [...spellings].filter(s => forms.has(s)).length
    if (score > bestScore) {
      best = d
      bestScore = score
    }
  }
  return { word: best, isTopResult: best === null || best === first }
}

export function buildWordEntry(rawJson: string, forms: WordForms): WordEntry | null {
  const json = JSON.parse(rawJson)
  const formSet = new Set([...forms.kanji, ...forms.readings])
  const headword = forms.kanji[0] ?? forms.readings[0]
  if (!headword) return null

  const { word: jisho, isTopResult } = pickJishoWord(json.jisho, headword, formSet)
  const mazii = isTopResult ? pickMaziiWord(json.mazii, headword, forms) : null

  const wordTypes = new Set<string>()
  const vietnamese: VietnameseSense[] = []
  for (const mean of mazii?.means ?? []) {
    const kinds: string[] = Array.isArray(mean.kind) ? mean.kind : (mean.kind ?? '').split(',')
    kinds.map(kindLabel).forEach(label => label && wordTypes.add(label))
    if (!meaningful(mean.mean)) continue
    vietnamese.push({
      meaning: tidy(mean.mean),
      examples: (mean.examples ?? [])
        .filter(e => meaningful(e.content) && meaningful(e.mean))
        .slice(0, MAX_EXAMPLES_PER_SENSE)
        .map(e => ({ japanese: e.content.trim(), vietnamese: tidy(e.mean) })),
    })
  }

  const english: EnglishSense[] = (jisho?.senses ?? [])
    // Jisho's Wikipedia sense only repeats the headword in English.
    .filter(sense => !(sense.parts_of_speech ?? []).includes('Wikipedia definition'))
    .map(sense => ({
      partsOfSpeech: sense.parts_of_speech ?? [],
      definitions: uniqueCaseInsensitive((sense.english_definitions ?? []).filter(meaningful)),
      notes: [...(sense.tags ?? []), ...(sense.info ?? [])].filter(meaningful),
    }))
    .filter(sense => sense.definitions.length > 0)

  if (vietnamese.length === 0 && english.length === 0) return null

  const jlpt = jisho?.jlpt?.[0]?.replace(/^jlpt-/i, '').toUpperCase() ?? null

  return {
    headword,
    otherWritings: forms.kanji.slice(1),
    readings: forms.kanji.length > 0 ? forms.readings : forms.readings.slice(1),
    pitchAccent: pitchAccentNumber(mazii?.pronunciation?.[0]?.accent),
    jlpt,
    common: jisho?.is_common === true,
    wordTypes: [...wordTypes],
    vietnamese,
    english,
    keys: [...new Set([headword, ...forms.kanji, ...forms.readings])],
  }
}

function splitReadings(text: string | undefined): string[] {
  return (text ?? '').split(/[\s、,]+/).map(s => s.trim()).filter(s => s.length > 0)
}

export function buildKanjiEntry(rawJson: string): KanjiEntry | null {
  const json = JSON.parse(rawJson)
  const mazii: MaziiKanjiResult | undefined = json.mazii?.[0]
  const jisho: KanjiParseResult | undefined = json.jisho?.found ? json.jisho : undefined
  const kanji = mazii?.kanji ?? jisho?.query
  if (!kanji) return null

  const onyomi = splitReadings(mazii?.on)
  const kunyomi = splitReadings(mazii?.kun)
  const strokes = Number(mazii?.stroke_count ?? jisho?.strokeCount)
  // The crawled JSON has radical.forms (e.g. 飠 for 食), which the library's types omit.
  const rad = jisho?.radical as { symbol: string, forms?: string[], meaning?: string } | undefined
  const radical = rad
    ? `${rad.symbol}${rad.forms?.length ? ` (${rad.forms.join(', ')})` : ''}${rad.meaning ? ` ${rad.meaning}` : ''}`
    : null

  const entry: KanjiEntry = {
    kanji,
    hanViet: meaningful(mazii?.mean) ? mazii!.mean!.trim() : null,
    vietnamese: meaningful(mazii?.detail) ? stripTags(mazii!.detail!).trim() : null,
    english: meaningful(jisho?.meaning) ? jisho!.meaning : null,
    onyomi: onyomi.length ? onyomi : jisho?.onyomi ?? [],
    kunyomi: kunyomi.length ? kunyomi : jisho?.kunyomi ?? [],
    jlpt: (mazii?.level?.[0] ?? jisho?.jlptLevel ?? null) || null,
    strokes: Number.isFinite(strokes) && strokes > 0 ? strokes : null,
    radical,
    components: (mazii?.compDetail ?? []).filter(c => c.w && c.w !== kanji).map(c => ({ kanji: c.w, hanViet: c.h ?? '' })),
    tip: meaningful(mazii?.tips?.vi) ? stripTags(mazii!.tips!.vi!).trim() : null,
    examples: (mazii?.examples ?? [])
      .filter(e => meaningful(e.w) && meaningful(e.m))
      .slice(0, MAX_KANJI_EXAMPLES)
      .map(e => ({ word: e.w.trim(), reading: (e.p ?? '').trim(), hanViet: (e.h ?? '').trim(), meaning: tidy(e.m) })),
  }

  if (!entry.hanViet && !entry.vietnamese && !entry.english) return null
  return entry
}
