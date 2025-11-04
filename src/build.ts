import 'dotenv/config'
import path from 'path'
import { Dictionary, DictionaryIndex, TermEntry } from "yomichan-dict-builder";
import * as schema from '../schemas'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { and, eq, gt, isNotNull, isNull, not } from 'drizzle-orm';
import type { SQLiteSelect } from 'drizzle-orm/sqlite-core';
import type { DetailedDefinition } from 'yomichan-dict-builder/dist/types/yomitan/termbank';

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

var entryTotal = 0
var entryInsertedTotal = 0
async function insertEntry(dictionary: Dictionary, entry: any) {
    const kanji = db.select()
        .from(kEle)
        .where(eq(entry.id, kEle.entryId))
        .all()
    const reading = db.select()
        .from(rEle)
        .where(eq(entry.id, rEle.entryId))
        .all()
    const meaning = db.select()
        .from(sense)
        .fullJoin(gloss, eq(sense.id, gloss.senseId))
        .where(eq(sense.entryId, entry.id))
        .all()

    const terms: string[] = [
        ...kanji.map(k=>k.keb),
        ...reading.map(r=>r.reb)
    ]
    const meanings :DetailedDefinition[] = meaning.map(m=>({
        type: 'text',
        text: m.gloss?.value ?? ''
    }))
    terms.forEach(t => {
        terms.forEach(t2=>{
            const newTerm = new TermEntry(t)
                .setReading(t2)
                .addDetailedDefinitions(meanings)
            dictionary.addTerm(newTerm.build())      
        })
    })
    console.log(`entry ${++entryInsertedTotal}/${entryTotal} has ${kanji.length} kanji ${reading.length} reading ${meaning.length} meaning`)
}

async function queryPaginatedEntries(dictionary: Dictionary, chunkLimit: number) {
    entryInsertedTotal = 0
    entryTotal = db.select()
        .from(entry)
        .all()
        .length
    const pagesTotal = Math.ceil(entryTotal / chunkLimit)
    for (var page = 0; page < pagesTotal; page++) {
        console.log(`page: ${page}/${pagesTotal}`)
        const entries = await db
            .select()
            .from(entry)
            .orderBy(entry.id)
            .where(gt(entry.id, page * chunkLimit))
            .limit(chunkLimit)
        entries.forEach(entry => insertEntry(dictionary, entry))
    }
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
    await queryPaginatedEntries(dictionary, 200)
    await dictionary.export()
}

await buildYomitanDict()
