import { createRequire } from 'module'
import { searchMaziiKanji, searchMaziiWord } from 'api'
const require = createRequire(import.meta.url)
type JishoAPICtor = new () => import('unofficial-jisho-api').default
// Fall back to the CommonJS build the ESM bundle expects cheerio to expose a default export.
const JishoAPI = require('unofficial-jisho-api') as unknown as JishoAPICtor

import 'dotenv/config'
import * as schema from '../schemas'
import { eq, sql, gt, gte, desc } from 'drizzle-orm'
import { getDatabase } from 'handler'
import { entry } from '../schemas'

const {
    kEle,
    rEle,
    rawWordCrawlJson,
    rawKanjiCrawlJson
} = schema

const jisho = new JishoAPI()
const minMs: number = Number.parseInt(process.env.MIN_CRAWL_SLEEP!)
const maxMs: number = Number.parseInt(process.env.MAX_CRAWL_SLEEP!)

let entryRatio = 0
let overallRatio = 0

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function randomSleep() {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
    console.log(`will sleep ${ms} then `)
    await sleep(ms)
}

const BAR_WIDTH = 30
function printProgress(prefix: string, ratio: number) {
    const filled = Math.round(BAR_WIDTH * ratio)
    const empty = BAR_WIDTH - filled
    const percent = Math.floor(ratio * 100)
    const bar = '='.repeat(filled) + '-'.repeat(empty)
    process.stdout.write(`\r${prefix} [${bar}] ${percent}%\n`)
}

function printOverallProcess(message: string)
{
    process.stdout.write('\x1b[2J\x1b[H')
    console.log(`           ${message}`)
    printProgress(`  ENTRY`, entryRatio)
    printProgress(`OVERALL`, overallRatio)
}

function isKanji(char: string): boolean {
    if (!char) return false
    const code = char.charCodeAt(0)
    return (
        (code >= 0x4e00 && code <= 0x9fff) ||  // CJK Unified Ideographs
        (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Extension A
        (code >= 0x20000 && code <= 0x2a6df) || // Extension B
        (code >= 0x2a700 && code <= 0x2b73f) || // Extension C
        (code >= 0x2b740 && code <= 0x2b81f) || // Extension D
        (code >= 0x2b820 && code <= 0x2ceaf) || // Extension E
        (code >= 0x2ceb0 && code <= 0x2ebef)    // Extension F
    )
}

async function crawlKanji(kanji: string) {
    await randomSleep()
    const jishoResult = await jisho.searchForKanji(kanji)
    const maziiKanji = await searchMaziiKanji(kanji)

    printOverallProcess(`* start query kanji ${kanji}`)
    return {
        type: "kanji",
        mazii: maziiKanji,
        jisho: jishoResult
    }
}

async function crawlWord(word: string) {
    await randomSleep()
    const jishoResult = await jisho.searchForPhrase(word)
    const maziiWord = await searchMaziiWord(word)

    printOverallProcess(`- start query word ${word}`)
    return {
        type: "word",
        mazii: maziiWord,
        jisho: jishoResult
    }
}

async function crawl(entryId: number, phrase: string) {
    const db = getDatabase()
    const existingPhrase = db
        .select({ entryId: rawWordCrawlJson.entryId })
        .from(rawWordCrawlJson)
        .where(eq(rawWordCrawlJson.entryId, entryId))
        .limit(1)
        .get()
    if (!existingPhrase) {
        const wordResult = await crawlWord(phrase)
        db.insert(rawWordCrawlJson)
            .values({
                entryId: entryId,
                json: JSON.stringify(wordResult)
            })
            .run()
    }

    const word: string[] = phrase.split('')
        .filter(element => isKanji(element))
    for (var i = 0; i < word.length; i++) {
        const existing = db
            .select({ id: rawKanjiCrawlJson.id })
            .from(rawKanjiCrawlJson)
            .where(eq(rawKanjiCrawlJson.textId, word[i]!))
            .limit(1)
            .get()
        if (existing) continue
        const kanjiResult = await crawlKanji(word[i]!)
        db.insert(rawKanjiCrawlJson)
            .values({
                textId: word[i]!,
                json: JSON.stringify(kanjiResult)
            })
            .run()
    }
}

export async function crawlFromDatabase() {
    process.stdout.write('\x1b[2J\x1b[H')
    const db = getDatabase()
    let chunkLimit = 100
    const totalEntry = db
        .select({ value: sql<number>`count(*)` })
        .from(entry)
        .get()?.value!;

    const maxEntryId = db.select()
                            .from(rawWordCrawlJson)
                            .orderBy(desc(rawWordCrawlJson.entryId))
                            .limit(1)
                            .values()
    let lastEntryId: number = maxEntryId.length > 0 ? maxEntryId[0]![1] - 1 : -1;

    while (true) {
        const kEntries = db
            .select()
            .from(kEle)
            .orderBy(kEle.entryId)
            .where(gt(kEle.entryId, lastEntryId))
            .limit(chunkLimit)
            .all()
            .values()
            .toArray()
        const rEntries =db
            .select()
            .from(kEle)
            .orderBy(kEle.entryId)
            .where(gt(kEle.entryId, lastEntryId))
            .limit(chunkLimit)
            .all()
            .values()
            .toArray()
        const entries = [
            ...kEntries,
            ...rEntries
        ]

        if (entries.length === 0) break

        lastEntryId = entries[entries.length - 1]!.entryId
        overallRatio = lastEntryId / totalEntry
        for (var i =0;i <entries.length;i++) {
            let row = entries[i]!
            overallRatio = (i + 1) / entries.length
            await crawl(row.entryId, row.keb)
        }
    }

    console.log("DONE!")
}
