import { createRequire } from 'module'
import { searchMaziiKanji, searchMaziiWord } from 'api'
const require = createRequire(import.meta.url)
type JishoAPICtor = new () => import('unofficial-jisho-api').default
// Fall back to the CommonJS build the ESM bundle expects cheerio to expose a default export.
const JishoAPI = require('unofficial-jisho-api') as unknown as JishoAPICtor

import 'dotenv/config'
import path, { relative } from 'path'
import * as schema from '../schemas'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { eq, sql, gt } from 'drizzle-orm'
import { exit } from 'process'

const {
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

async function randomSleep() {
    const minMs: number = 500
    const maxMs: number = 1500
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
    console.log(`  ~ will sleep ${ms} then `)
    await sleep(ms)
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

    console.log(`  * start query kanji ${kanji}`)
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

    console.log(`  - start query word ${word}`)
    return {
        type: "word",
        mazii: maziiWord,
        jisho: jishoResult
    }
}

async function crawl(entryId: number, phrase: string) {
    const existingPhrase = db
            .select({ entryId: rawWordCrawlJson.entryId })
            .from(rawWordCrawlJson)
            .where(eq(rawWordCrawlJson.entryId, entryId))
            .limit(1)
            .get()
    if(!existingPhrase)
    {
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

async function crawlFromDatabase() {
    let chunkLimit = 200
    let entryInsertedTotal = 0;
    const totalKeleRows = db
        .select({ value: sql<number>`count(*)` })
        .from(kEle)
        .get()?.value!;
    const totalReleRows = db
        .select({ value: sql<number>`count(*)` })
        .from(rEle)
        .get()?.value!;

    const totalRows = totalKeleRows + totalReleRows

    let lastEntryId: number = -1;

    while (true) {
        const entries = db
            .select()
            .from(kEle)
            .orderBy(kEle.id)
            .where(gt(kEle.id, lastEntryId))
            .limit(chunkLimit)
            .all()
            .values()
            .toArray()

        if (entries.length === 0) break

        lastEntryId = entries[entries.length - 1]!.id
        for (const row of entries) {
            entryInsertedTotal++
            console.log(`start crawl ${entryInsertedTotal}/${totalRows} at row ${row.keb}`)
            await crawl(row.entryId, row.keb)
        }
    }

    lastEntryId = -1
    while (true) {
        const entries = db
            .select()
            .from(rEle)
            .orderBy(rEle.id)
            .where(gt(rEle.id, lastEntryId))
            .limit(chunkLimit)
            .all()
            .values()
            .toArray()

        if (entries.length === 0) break

        lastEntryId = entries[entries.length - 1]!.id
        for (const row of entries) {
            console.log(`start crawl ${entryInsertedTotal}/${totalRows} at row ${row.reb}`)
            await crawl(row.entryId, row.reb)
            entryInsertedTotal++
        }
    }

    console.log("DONE!")
}

// async function crawlTest()
// {
//     await crawl("々")
//     await crawl("家")
//     await crawl("家族")
//     await crawl("いちぞく")
// }

db.delete(rawWordCrawlJson).run()
db.delete(rawKanjiCrawlJson).run()
exit(0)

await crawlFromDatabase()

sqlite.close()