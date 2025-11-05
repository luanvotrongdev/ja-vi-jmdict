import { createRequire } from 'module'
import { searchMaziiKanji, searchMaziiWord } from 'api'
const require = createRequire(import.meta.url)
type JishoAPICtor = new () => import('unofficial-jisho-api').default
// Fall back to the CommonJS build; the ESM bundle expects cheerio to expose a default export.
const JishoAPI = require('unofficial-jisho-api') as unknown as JishoAPICtor

import 'dotenv/config'
import path from 'path'
import { Dictionary, DictionaryIndex, KanjiEntry, TermEntry } from "yomichan-dict-builder";
import * as schema from '../schemas'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { eq, gt, inArray, sql } from 'drizzle-orm';
import type { DetailedDefinition } from 'yomichan-dict-builder/dist/types/yomitan/termbank';
import type { JishoAPIResult, KanjiParseResult } from 'unofficial-jisho-api'

const {
    entry,
    kEle,
    rEle,
    rawWordCrawlJson,
    rawKanjiCrawlJson
} = schema

const kanjiPattern = /^[\u4E00-\u9FAF\u3400-\u4DBF]+$/u

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
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function randomSleep(minMs: number, maxMs: number) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await sleep(ms);
}

function isKanji(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||  // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // Extension B
    (code >= 0x2a700 && code <= 0x2b73f) || // Extension C
    (code >= 0x2b740 && code <= 0x2b81f) || // Extension D
    (code >= 0x2b820 && code <= 0x2ceaf) || // Extension E
    (code >= 0x2ceb0 && code <= 0x2ebef)    // Extension F
  );
}

async function crawlKanji(kanji: string)
{
    randomSleep(1000, 3000)
    const jishoResult = await jisho.searchForKanji(kanji)
    const maziiKanji = await searchMaziiKanji(kanji)
    return {
        type: "kanji",
        mazii: maziiKanji,
        jisho: jishoResult
    }
}

async function crawlWord(word: string)
{
    randomSleep(1000, 3000)
    const jishoResult = await jisho.searchForPhrase(word)
    const maziiWord = await searchMaziiWord(word)
    return {
        type: "word",
        mazii: maziiWord,
        jisho: jishoResult
    }
}

async function crawl(phrase: string)
{
    const wordResult = await crawlWord(phrase)
    db.insert(rawWordCrawlJson)
            .values({
                json: JSON.stringify(wordResult)
            })
            .run()

    const word: string[] = phrase.split('')
                                .filter(element => isKanji(element))
    for(var i =0;i<word.length;i++)
    {
        const existing = db
                        .select({ id: rawKanjiCrawlJson.id })
                        .from(rawKanjiCrawlJson)
                        .where(eq(rawKanjiCrawlJson.id, word[i]!))
                        .limit(1)
                        .get()
        if(existing) continue
        const kanjiResult = await crawlKanji(word[i]!)
        db.insert(rawKanjiCrawlJson)
            .values({
                id: word[i]!,
                json: JSON.stringify(kanjiResult)
            })
            .run()
        console.log(`INSERT ${word[i]}`)
    }
}

await crawl("々")
await crawl("家")
await crawl("家族")
await crawl("いちぞく")

sqlite.close()