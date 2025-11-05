import { createRequire } from 'module'
import { searchMaziiKanji, searchMaziiWord } from 'api'
const require = createRequire(import.meta.url)
type JishoAPICtor = new () => import('unofficial-jisho-api').default
// Fall back to the CommonJS build the ESM bundle expects cheerio to expose a default export.
const JishoAPI = require('unofficial-jisho-api') as unknown as JishoAPICtor

import 'dotenv/config'
import path from 'path'
import * as schema from '../schemas'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { eq } from 'drizzle-orm'

const {
    entry,
    kEle,
    rEle,
    rawWordCrawlJson,
    rawKanjiCrawlJson
} = schema

const dbPath = path.isAbsolute(process.env.DB_PATH || '')
    ? (process.env.DB_FILE_NAME || '')
    : path.resolve(process.cwd(), process.env.DB_PATH || '')
if (!dbPath) {
    throw new Error(
        `Database does not exist.`,
    )
}
const sqlite = Database.open(dbPath, {
    readwrite: true
})
sqlite.run('PRAGMA foreign_keys = ON')

const hasEntryTable = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get('entry')
if (!hasEntryTable) {
    sqlite.close()
    throw new Error(
        `SQLite schema is missing expected JMdict tables. Run "npx drizzle-kit push" to create them before importing.`,
    )
}

const db = drizzle(sqlite, { schema })

const jisho = new JishoAPI()

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function randomSleep(minMs: number, maxMs: number) {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
    await sleep(ms)
    return ms
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
    const slept = await randomSleep(1000, 3000)
    const jishoResult = await jisho.searchForKanji(kanji)
    const maziiKanji = await searchMaziiKanji(kanji)

    console.log(`queried kanji ${kanji} slept ${slept}`)
    return {
        type: "kanji",
        mazii: maziiKanji,
        jisho: jishoResult
    }
}

async function crawlWord(word: string) {
    const slept = await randomSleep(1000, 3000)
    const jishoResult = await jisho.searchForPhrase(word)
    const maziiWord = await searchMaziiWord(word)

    console.log(`queried word ${word} slept ${slept}`)
    return {
        type: "word",
        mazii: maziiWord,
        jisho: jishoResult
    }
}

async function crawl(phrase: string) {
    const wordResult = await crawlWord(phrase)
    db.insert(rawWordCrawlJson)
        .values({
            json: JSON.stringify(wordResult)
        })
        .run()

    const word: string[] = phrase.split('')
        .filter(element => isKanji(element))
    for (var i = 0; i < word.length; i++) {
        const existing = db
            .select({ id: rawKanjiCrawlJson.id })
            .from(rawKanjiCrawlJson)
            .where(eq(rawKanjiCrawlJson.id, word[i]!))
            .limit(1)
            .get()
        if (existing) continue
        const kanjiResult = await crawlKanji(word[i]!)
        db.insert(rawKanjiCrawlJson)
            .values({
                id: word[i]!,
                json: JSON.stringify(kanjiResult)
            })
            .run()
    }
}

db.delete(rawWordCrawlJson).run()
db.delete(rawKanjiCrawlJson).run()

await crawl("々")
await crawl("家")
await crawl("家族")
await crawl("いちぞく")

sqlite.close()