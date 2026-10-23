// Builds output/lulujv.zip, a Yomitan dictionary, from the crawled entries.
// Format: https://github.com/yomidevs/yomitan/tree/master/ext/data/schemas
import 'dotenv/config'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { gt, sql } from 'drizzle-orm'
import { Dictionary, DictionaryIndex } from 'yomichan-dict-builder'
import type {
    StructuredContentNode,
    StructuredContentStyle,
    TermInformation,
} from 'yomichan-dict-builder/dist/types/yomitan/termbank'
import * as schema from '../schemas'
import packageJson from '../package.json'
import { getDatabase } from 'handler'
import { buildKanjiEntry, buildWordEntry, loadWordForms, type KanjiEntry, type WordEntry } from 'entries'

const { rawKanjiCrawlJson, rawWordCrawlJson } = schema

const OUTPUT_DIR = './output'
const OUTPUT_FILE = 'lulujv.zip'
// The dictionary revision follows the project version in package.json.
const REVISION = packageJson.version

//----------------------------------------------------------------------
// Styles. Colors are semi-transparent so they work in light and dark themes.

const MUTED = 'rgba(128, 128, 128, 1)'
const RULE = 'rgba(128, 128, 128, 0.45)'

const pillStyle: StructuredContentStyle = {
    fontSize: '0.75em',
    backgroundColor: 'rgba(86, 130, 201, 0.18)',
    borderRadius: '0.35em',
    padding: '0.05em 0.45em',
    marginRight: '0.3em',
    whiteSpace: 'nowrap',
}
const exampleStyle: StructuredContentStyle = {
    fontSize: '0.88em',
    borderStyle: 'solid',
    borderWidth: '0 0 0 2px',
    borderColor: RULE,
    paddingLeft: '0.55em',
    marginTop: '0.2em',
    marginBottom: '0.2em',
}
const sectionLabelStyle: StructuredContentStyle = {
    fontSize: '0.75em',
    fontWeight: 'bold',
    color: MUTED,
    borderStyle: 'solid',
    borderWidth: '1px 0 0 0',
    borderColor: RULE,
    paddingTop: '0.25em',
    marginTop: '0.45em',
}
const listStyle: StructuredContentStyle = { paddingLeft: '1.4em', marginTop: '0.15em', marginBottom: '0' }
const mutedSmall: StructuredContentStyle = { fontSize: '0.8em', color: MUTED }

// `data` becomes data-sc-content="…" in Yomitan, so users can restyle parts with custom CSS.
const node = (
    tag: 'span' | 'div' | 'ol' | 'li',
    content: StructuredContentNode,
    style?: StructuredContentStyle,
    extra: { lang?: string, part?: string } = {},
): StructuredContentNode => ({
    tag,
    content,
    ...(style ? { style } : {}),
    ...(extra.lang ? { lang: extra.lang } : {}),
    ...(extra.part ? { data: { content: extra.part } } : {}),
})

//----------------------------------------------------------------------
// Word entries

// Yomitan only deinflects (食べた → 食べる) when the entry names its rule.
const MAZII_RULES: [RegExp, string][] = [
    [/^v1$/, 'v1'], [/^v5/, 'v5'], [/^vs(-[is])?$/, 'vs'], [/^vk$/, 'vk'], [/^vz$/, 'vz'], [/^adj-ix?$/, 'adj-i'],
]
const JISHO_RULES: [RegExp, string][] = [
    [/^Ichidan verb/, 'v1'], [/^Godan verb/, 'v5'], [/^Suru verb/, 'vs'], [/^Kuru verb/, 'vk'],
    [/^Zuru verb/, 'vz'], [/^I-adjective/, 'adj-i'],
]

// Yomitan's する/来る/ずる rules only apply to terms ending that way; JMdict
// also marks nouns like 勉強 as "vs" (takes する), which Yomitan can't use.
const RULE_ENDINGS: Record<string, RegExp> = { vs: /する$/, vk: /(くる|来る)$/, vz: /ずる$/ }

function rulesForTerm(rules: string[], term: string): string {
    return rules.filter(r => !RULE_ENDINGS[r] || RULE_ENDINGS[r]!.test(term)).join(' ')
}

function inflectionRules(e: WordEntry): string[] {
    const rules = new Set<string>()
    for (const code of e.kindCodes) {
        for (const [re, rule] of MAZII_RULES) if (re.test(code)) rules.add(rule)
    }
    for (const sense of e.english) {
        for (const pos of sense.partsOfSpeech) {
            for (const [re, rule] of JISHO_RULES) if (re.test(pos)) rules.add(rule)
        }
    }
    return [...rules]
}

function renderWordContent(e: WordEntry): StructuredContentNode[] {
    const out: StructuredContentNode[] = []

    if (e.vietnamese.length) {
        if (e.wordTypes.length) {
            out.push(node('div', e.wordTypes.map(t => node('span', t, pillStyle)), { marginBottom: '0.2em' }, { lang: 'vi', part: 'word-types' }))
        }
        const senses = e.vietnamese.map(sense => node('li', [
            sense.meaning,
            ...sense.examples.map(ex => node('div', [
                node('span', ex.japanese, undefined, { lang: 'ja' }),
                { tag: 'br' },
                node('span', ex.vietnamese, { fontStyle: 'italic', color: MUTED }, { lang: 'vi' }),
            ], exampleStyle, { part: 'example' })),
        ]))
        out.push(senses.length === 1
            ? node('div', (senses[0] as { content: StructuredContentNode }).content, undefined, { lang: 'vi', part: 'vietnamese' })
            : node('ol', senses, listStyle, { lang: 'vi', part: 'vietnamese' }))
    }

    if (e.english.length) {
        if (e.vietnamese.length) out.push(node('div', 'English', sectionLabelStyle, { part: 'section-label' }))
        let previousPos = ''
        const senses = e.english.map(sense => {
            const pos = sense.partsOfSpeech.join(', ')
            const parts: StructuredContentNode[] = []
            if (pos && pos !== previousPos) {
                parts.push(node('span', pos, { ...mutedSmall, fontStyle: 'italic' }), { tag: 'br' })
            }
            previousPos = pos
            parts.push(sense.definitions.join('; '))
            if (sense.notes.length) parts.push(' ', node('span', `(${sense.notes.join('; ')})`, mutedSmall))
            return node('li', parts)
        })
        out.push(node('ol', senses, listStyle, { lang: 'en', part: 'english' }))
    }

    return out
}

async function addWord(dictionary: Dictionary, e: WordEntry, seenPitch: Set<string>) {
    const content = renderWordContent(e)
    const rules = inflectionRules(e)
    const termTags = [e.jlpt, e.common ? '★' : null].filter(Boolean).join(' ')
    const baseScore = (e.common ? 10 : 0) + (e.jlpt ? 5 : 0)

    // One term per (spelling, reading) pair; the shared sequence number lets
    // Yomitan merge them into one result.
    const pairs: [term: string, reading: string, score: number][] = []
    const { kanji, readings } = e.forms
    if (kanji.length > 0) {
        kanji.forEach((k, i) => readings.forEach((r, j) => pairs.push([k, r, baseScore - i - j])))
    } else {
        readings.forEach((r, j) => pairs.push([r, r, baseScore - j]))
    }

    for (const [term, reading, score] of pairs) {
        const info: TermInformation = [
            term,
            reading === term ? '' : reading,
            '',
            rulesForTerm(rules, term),
            score,
            [{ type: 'structured-content', content }],
            e.forms.sequence,
            termTags,
        ]
        await dictionary.addTerm(info)

        const position = e.pitchByReading.get(reading)
        const key = `${term}\u0000${reading}`
        if (position !== undefined && !seenPitch.has(key)) {
            seenPitch.add(key)
            await dictionary.addTermMeta([term, 'pitch', { reading, pitches: [{ position }] }])
        }
    }
}

//----------------------------------------------------------------------
// Kanji entries. Yomitan shows kanji meanings as plain text, plus a stats table.

const KANJI_STATS: { key: keyof KanjiStatsValues, label: string, order: number }[] = [
    { key: 'strokes', label: 'Số nét', order: 1 },
    { key: 'jlpt', label: 'JLPT', order: 2 },
    { key: 'grade', label: 'Cấp học (Nhật)', order: 3 },
    { key: 'freq', label: 'Tần suất trên báo', order: 4 },
    { key: 'radical', label: 'Bộ thủ', order: 5 },
    { key: 'parts', label: 'Thành phần', order: 6 },
]
type KanjiStatsValues = { strokes?: string, jlpt?: string, grade?: string, freq?: string, radical?: string, parts?: string }

async function addKanji(dictionary: Dictionary, e: KanjiEntry) {
    const meanings: string[] = []
    if (e.hanViet) meanings.push(`【${e.hanViet}】`)
    if (e.vietnamese) {
        meanings.push(...e.vietnamese.split('##').map(s => s.trim()).filter(s => s.length > 0))
    }
    if (e.english) meanings.push(`English: ${e.english}`)
    if (e.tip) meanings.push(`Mẹo nhớ: ${e.tip}`)
    if (e.examples.length) {
        meanings.push(`Ví dụ: ${e.examples.map(ex => {
            const reading = ex.reading ? ` (${ex.reading})` : ''
            const hanViet = ex.hanViet ? ` ${ex.hanViet}` : ''
            return `${ex.word}${reading}${hanViet}: ${ex.meaning}`
        }).join(' ・ ')}`)
    }
    if (meanings.length === 0) return

    const stats: KanjiStatsValues = {}
    if (e.strokes) stats.strokes = String(e.strokes)
    if (e.jlpt) stats.jlpt = e.jlpt
    if (e.grade) stats.grade = e.grade
    if (e.newspaperRank) stats.freq = String(e.newspaperRank)
    if (e.radical) stats.radical = e.radical
    if (e.components.length) {
        stats.parts = e.components.map(c => c.hanViet ? `${c.kanji} ${c.hanViet}` : c.kanji).join(' · ')
    }

    await dictionary.addKanji({
        kanji: e.kanji,
        onyomi: e.onyomi.join(' '),
        kunyomi: e.kunyomi.join(' '),
        tags: e.jlpt ?? '',
        meanings,
        stats: stats as Record<string, string>,
    })
}

//----------------------------------------------------------------------

function addTags(dictionary: Dictionary) {
    dictionary.addTag({ name: '★', category: 'popular', sortingOrder: -10, notes: 'Từ thông dụng (common word)', popularityScore: 10 })
    for (const level of ['N1', 'N2', 'N3', 'N4', 'N5']) {
        dictionary.addTag({ name: level, category: 'frequent', sortingOrder: -5, notes: `JLPT ${level}` })
    }
    for (const stat of KANJI_STATS) {
        dictionary.addTag({ name: stat.key, category: 'misc', sortingOrder: stat.order, notes: stat.label })
    }
}

function buildIndex() {
    const index = new DictionaryIndex()
        .setTitle('Lulu J-V Dictionary')
        .setRevision(REVISION)
        .setAuthor('Vo Trong Luan')
        .setUrl('https://github.com/luanvotrongdev/ja-vi-jmdict')
        .setDescription('A Japanese → Vietnamese / English dictionary built from JMdict, Mazii and Jisho.')
        .setAttribution('JMdict (EDRDG, CC BY-SA 4.0); Vietnamese from Mazii.net; English from Jisho.org')
        .setSequenced(true)
        .build()
    return { ...index, sourceLanguage: 'ja' as const, targetLanguage: 'vi' as const }
}

export async function buildYomitan() {
    if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

    const dictionary = new Dictionary({ fileName: OUTPUT_FILE })
    const index = buildIndex()
    // Also writes ./index.json. An absolute path: with "./" the library's
    // existsSync check fails under Bun on Windows and mkdir throws EEXIST.
    await dictionary.setIndex(index, process.cwd(), 'index.json')
    addTags(dictionary)

    const db = getDatabase()
    const count = (table: typeof rawWordCrawlJson | typeof rawKanjiCrawlJson) =>
        db.select({ value: sql<number>`count(*)` }).from(table).get()?.value ?? 0
    const total = count(rawWordCrawlJson) + count(rawKanjiCrawlJson)
    let done = 0
    const progress = () => {
        if (++done % 10000 === 0 || done === total) console.log(`${done}/${total}`)
    }

    const seenPitch = new Set<string>()
    let lastId = -1
    while (true) {
        const rows = db.select().from(rawWordCrawlJson)
            .where(gt(rawWordCrawlJson.id, lastId)).orderBy(rawWordCrawlJson.id).limit(2000).all()
        if (rows.length === 0) break
        lastId = rows[rows.length - 1]!.id
        const forms = loadWordForms(rows.map(r => r.entryId))
        for (const row of rows) {
            const f = forms.get(row.entryId)
            const entry = f ? buildWordEntry(row.json, f) : null
            if (entry) await addWord(dictionary, entry, seenPitch)
            progress()
        }
    }

    lastId = -1
    while (true) {
        const rows = db.select().from(rawKanjiCrawlJson)
            .where(gt(rawKanjiCrawlJson.id, lastId)).orderBy(rawKanjiCrawlJson.id).limit(2000).all()
        if (rows.length === 0) break
        lastId = rows[rows.length - 1]!.id
        for (const row of rows) {
            const entry = buildKanjiEntry(row.json)
            if (entry) await addKanji(dictionary, entry)
            progress()
        }
    }

    // Export once at the end: each export re-compresses the whole ZIP.
    const stats = await dictionary.export(path.resolve(OUTPUT_DIR))
    console.log(`Wrote ${OUTPUT_DIR}/${OUTPUT_FILE}:`, stats)
}
