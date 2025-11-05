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
    sense,
    gloss,
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

async function crawlKanji(kanji: string, jishoResult: KanjiParseResult)
{
    const maziiKanji = await searchMaziiKanji(kanji)
    return {
        type: "kanji",
        mazii: maziiKanji,
        jisho: jishoResult
    }
}

async function crawlWord(word: string, jishoResult: JishoAPIResult)
{
    const maziiWord = await searchMaziiWord(word)
    return {
        type: "word",
        mazii: maziiWord,
        jisho: jishoResult
    }
}

async function crawl(word: string)
{
    // var kanjiParseResult = await jisho.searchForKanji(word)
    // if(kanjiParseResult.found)
    //     return crawlKanji(word, kanjiParseResult)
    var wordParseResult = await jisho.searchForPhrase(word)
    return crawlWord(word, wordParseResult)
}


const result = await crawl("家")
console.log(JSON.stringify(result))
// crawl("家族")
// crawl("いちぞく")

