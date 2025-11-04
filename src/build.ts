import 'dotenv/config'
import path from 'path'
import { Dictionary, DictionaryIndex, TermEntry } from "yomichan-dict-builder";
import * as schema from '../schemas'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { and, eq, gt, isNotNull, isNull, not } from 'drizzle-orm';
import type { SQLiteSelect } from 'drizzle-orm/sqlite-core';

const {
    entry,
    kEle,
    keInf,
    kePri,
    rEle,
    reRestr,
    reInf,
    rePri,
    sense,
    stagk,
    stagr,
    pos,
    xref,
    ant,
    field,
    misc,
    senseInfo,
    lsource,
    dial,
    gloss,
    glossPriority,
    example,
    exampleSentence,
} = schema

function withPagination<T extends SQLiteSelect>(
    qb: T,
    startId: number | null = null,
    pageSize: number | null = null,
) {
    if (startId == null) {
        return qb.all();
    }
    var result = qb.where(gt(rEle.id, startId))
    if (pageSize == null) {
        return result
    }
    return result.limit(pageSize);
}

const dbPath = path.isAbsolute(process.env.DB_PATH)
    ? process.env.DB_FILE_NAME
    : path.resolve(process.cwd(), process.env.DB_PATH)
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

/**
 * @type {import('../dist/types/yomitan/termbank').StructuredContent}
 */
const sc = {
    tag: 'span',
    content: 'string',
    data: {
        'dict-data': 'test',
    },
    lang: 'ja',
    style: {
        fontSize: '20px',
        fontWeight: 'normal',
        textDecorationLine: 'overline',
    },
};

/**
 * @type {import('../dist/types/yomitan/termbank').DetailedDefinition}
 */
const detailedDefinition = {
    type: 'structured-content',
    content: sc,
};

var rebNullCount = 0
var kebNullCount = 0
var entryTotal = 0
var entryInsertedTotal = 0
async function insertTermEntry(dictionary: Dictionary, entries: any[])
{
    entries.forEach(entry=>{
        console.log(`Inserted: ${++entryInsertedTotal}/${entryTotal}`)
        if(entry.r_ele == null || entry.r_ele?.reb == null)
            rebNullCount++
        if(entry.k_ele == null || entry.k_ele?.keb == null)
            kebNullCount++
        const newTerm = new TermEntry(entry.r_ele?.reb)
        newTerm.setReading(entry.k_ele?.keb)
        if(entry.gloss?.value != null)
            newTerm.addDetailedDefinition(entry.gloss?.value)
        
        const builtTerm = newTerm.build()
        dictionary.addTerm(builtTerm)
    }) 
}

async function queryTermEntries(dictionary: Dictionary, chunkLimit: number) {
    entryInsertedTotal = 0
    rebNullCount = 0
    kebNullCount = 0

    entryTotal = db.select()
        .from(entry)
        .all()
        .length
    const pagesTotal = Math.ceil(entryTotal / chunkLimit)
    for (var page = 0; page < pagesTotal; page++) {
        console.log(`page: ${page}/${pagesTotal}`)
        const entries = await db
            .select()
            .from(rEle)
            .orderBy(rEle.entryId)
            .where(gt(rEle.id, page*chunkLimit))
            .limit(chunkLimit)
            .rightJoin(kEle, eq(rEle.entryId, kEle.entryId))
            .rightJoin(sense, eq(rEle.entryId, sense.entryId))
            .rightJoin(gloss, eq(sense.entryId, gloss.senseId))
            .$dynamic()
        insertTermEntry(dictionary, entries)
    }

    console.log(`NULL REB: ${rebNullCount} KEB: ${kebNullCount}`)
}

export async function buildYomitanDict() {
    const dictionary = new Dictionary({
        fileName: "./output/lulujv.zip"
    })

    const index = new DictionaryIndex()
        .setTitle("Lulu J-V Dictionary")
        .setAuthor("LULU")
        .setRevision("0.2")
        .setDescription("A test dictionary for Yomitan dict")
        .setAttribution('test')
        .build()
    await dictionary.setIndex(index)
    await queryTermEntries(dictionary, 200)
    await dictionary.export()
}

await buildYomitanDict()