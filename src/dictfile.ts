// Writes the crawled dictionary as a dictgen dictfile (.df) with raw HTML
// entries, ready for `kobo` to turn into a Kobo dictzip.
// Dictfile format: https://pgaskin.net/dictutil/dictgen/
import 'dotenv/config'
import { createWriteStream, WriteStream } from 'node:fs'
import { existsSync, mkdirSync } from 'node:fs'
import { gt, sql } from 'drizzle-orm'
import * as schema from '../schemas'
import { getDatabase } from 'handler'
import { hiraganaToKatakana, isAllKana } from 'kobo'
import {
    buildKanjiEntry,
    buildWordEntry,
    loadWordForms,
    type KanjiEntry,
    type WordEntry,
} from 'entries'

const {
    rawKanjiCrawlJson,
    rawWordCrawlJson,
} = schema

// Kobo's fonts draw Vietnamese tone marks badly when they are separate
// combining characters (NFD), so compose them (NFC). Also drop invisible
// characters and keep each value on one dictfile line.
function cleanText(text: string): string {
    return text
        .normalize('NFC')
        .replace(/[​﻿­\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
        .replace(/\s*[\r\n\t]+\s*/g, ' ')
        .trim()
}

function writeLine(ws: WriteStream, text: string) {
    ws.write(`${cleanText(text)}\n`)
}

function esc(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// Kobo shows dictionary text in its built-in Georgia, which lacks most
// Vietnamese letters (ư ơ ạ ả ấ ự …). Kobo Nickel has them; a sideloaded
// font can be added in front. Japanese still falls back to Kobo's CJK font.
const FONT_STACK = `'Kobo Nickel', 'Noto Serif', Georgia, serif`
const fontStyle = `font-family: ${FONT_STACK}`

const gray = (html: string) => `<font color="gray">${html}</font>`
const small = (html: string) => `<small>${html}</small>`

// Writes one raw-HTML dictfile entry. `::` turns off dictgen's own header
// (we render our own). All-kana keys also get a katakana variant, because
// Kobo looks hiragana words up in katakana.
function writeEntry(ws: WriteStream, keys: string[], html: string) {
    const [headword, ...others] = keys
    if (!headword) return
    const variants = new Set(others)
    for (const key of keys) {
        if (isAllKana(key)) variants.add(hiraganaToKatakana(key))
    }
    variants.delete(headword)
    writeLine(ws, `@ ${headword}`)
    writeLine(ws, '::')
    variants.forEach(v => writeLine(ws, `& ${v}`))
    writeLine(ws, '<html>')
    writeLine(ws, html)
}

function renderWord(e: WordEntry): string {
    const parts: string[] = []

    // 食べる 【たべる】 [2]  N5 · thông dụng
    const tags = [e.jlpt, e.common ? 'thông dụng' : null].filter(Boolean) as string[]
    let header = `<b>${esc(e.headword)}</b>`
    if (e.readings.length) header += ` 【${esc(e.readings.slice(0, 3).join('・'))}】`
    if (e.pitchAccent !== null) header += ` ${gray(`[${e.pitchAccent}]`)}`
    if (tags.length) header += ` ${small(gray(esc(tags.join(' · '))))}`
    parts.push(`<p>${header}</p>`)
    if (e.otherWritings.length) {
        parts.push(`<p>${small(gray(`Cách viết khác: ${esc(e.otherWritings.join('、'))}`))}</p>`)
    }

    if (e.vietnamese.length) {
        if (e.wordTypes.length) {
            parts.push(`<p><i>${esc(capitalize(e.wordTypes.join(' · ')))}</i></p>`)
        }
        const items = e.vietnamese.map(sense => {
            const examples = sense.examples
                .map(ex => `<br/>${small(`${esc(ex.japanese)}<br/><i>${esc(ex.vietnamese)}</i>`)}`)
                .join('')
            return `<li>${esc(sense.meaning)}${examples}</li>`
        })
        parts.push(`<ol>${items.join('')}</ol>`)
    }

    if (e.english.length) {
        parts.push(`<p>${gray('English')}</p>`)
        let previousPos = ''
        const items = e.english.map(sense => {
            const pos = sense.partsOfSpeech.join(', ')
            const posHtml = pos && pos !== previousPos ? `${small(gray(`<i>${esc(pos)}</i>`))}<br/>` : ''
            previousPos = pos
            const notes = sense.notes.length ? ` ${small(gray(`(${esc(sense.notes.join('; '))})`))}` : ''
            return `<li>${posHtml}${esc(sense.definitions.join('; '))}${notes}</li>`
        })
        parts.push(`<ol>${items.join('')}</ol>`)
    }

    // kobo.ts lists common words first when several entries share a key.
    return `<div class="word${e.common ? ' common' : ''}" style="${fontStyle}">${parts.join('')}</div>`
}

function renderKanji(e: KanjiEntry): string {
    const parts: string[] = []

    // 食  THỰC, TỰ  N5 · 9 nét
    const tags = [e.jlpt, e.strokes ? `${e.strokes} nét` : null].filter(Boolean) as string[]
    let header = `<span style="font-size:1.8em"><b>${esc(e.kanji)}</b></span>`
    if (e.hanViet) header += ` <b>${esc(e.hanViet)}</b>`
    if (tags.length) header += ` ${small(gray(esc(tags.join(' · '))))}`
    parts.push(`<p>${header}</p>`)

    // Mazii separates paragraphs with "##".
    if (e.vietnamese) {
        const paragraphs = e.vietnamese.split('##').map(s => s.trim()).filter(s => s.length > 0)
        parts.push(`<p>${paragraphs.map(esc).join('<br/>')}</p>`)
    }
    if (e.english) parts.push(`<p>${gray('English:')} ${esc(e.english)}</p>`)

    const rows: string[] = []
    const row = (label: string, value: string) => rows.push(`${gray(`${label}:`)} ${value}`)
    if (e.onyomi.length) row('Âm On', esc(e.onyomi.join('、')))
    if (e.kunyomi.length) row('Âm Kun', esc(e.kunyomi.join('、')))
    if (e.radical) row('Bộ', esc(e.radical))
    if (e.components.length) {
        row('Thành phần', esc(e.components.map(c => c.hanViet ? `${c.kanji} ${c.hanViet}` : c.kanji).join(' · ')))
    }
    if (e.tip) row('Mẹo nhớ', esc(e.tip))
    if (rows.length) parts.push(`<p>${rows.join('<br/>')}</p>`)

    if (e.examples.length) {
        const examples = e.examples.map(ex => {
            const reading = ex.reading ? ` (${esc(ex.reading)})` : ''
            const hanViet = ex.hanViet ? ` ${small(gray(esc(ex.hanViet)))}` : ''
            return `${esc(ex.word)}${reading}${hanViet}: ${esc(ex.meaning)}`
        })
        parts.push(`<p>${gray('Ví dụ:')}<br/>${examples.join('<br/>')}</p>`)
    }

    // kobo.ts uses class="kanji" to list kanji entries after word entries.
    return `<div class="kanji" style="${fontStyle}">${parts.join('')}</div>`
}

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

async function writeAllEntries(ws: WriteStream, chunkLimit: number) {
    const db = getDatabase()
    const count = (table: typeof rawWordCrawlJson | typeof rawKanjiCrawlJson) =>
        db.select({ value: sql<number>`count(*)` }).from(table).get()?.value ?? 0
    const total = count(rawWordCrawlJson) + count(rawKanjiCrawlJson)
    let done = 0
    let written = 0
    const progress = () => {
        if (done % 10000 === 0 || done === total) console.log(`${done}/${total} (${written} written)`)
    }

    // Words
    let lastId = -1
    while (true) {
        const rows = db.select().from(rawWordCrawlJson)
            .where(gt(rawWordCrawlJson.id, lastId)).orderBy(rawWordCrawlJson.id).limit(chunkLimit).all()
        if (rows.length === 0) break
        lastId = rows[rows.length - 1]!.id
        const forms = loadWordForms(rows.map(r => r.entryId))
        for (const row of rows) {
            const f = forms.get(row.entryId)
            const entry = f ? buildWordEntry(row.json, f) : null
            if (entry) {
                writeEntry(ws, entry.keys, renderWord(entry))
                written++
            }
            done++
            progress()
        }
    }

    // Kanji
    lastId = -1
    while (true) {
        const rows = db.select().from(rawKanjiCrawlJson)
            .where(gt(rawKanjiCrawlJson.id, lastId)).orderBy(rawKanjiCrawlJson.id).limit(chunkLimit).all()
        if (rows.length === 0) break
        lastId = rows[rows.length - 1]!.id
        for (const row of rows) {
            const entry = buildKanjiEntry(row.json)
            if (entry) {
                writeEntry(ws, [entry.kanji], renderKanji(entry))
                written++
            }
            done++
            progress()
        }
    }
}

export async function buildDictfile() {
    const outputDir = './output'
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
    }
    const writeStream = createWriteStream(`${outputDir}/japanese-english.df`, { flags: 'w' })
    await writeAllEntries(writeStream, 2000)
    // Flush before `kobo` reads the file.
    await new Promise<void>((resolve, reject) => writeStream.end((err?: Error | null) => err ? reject(err) : resolve()))
}
