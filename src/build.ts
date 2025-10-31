import 'dotenv/config'
import path from 'path'
import { Dictionary, DictionaryIndex, TermEntry } from "yomichan-dict-builder";
import * as schema from '../schemas'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { eq, gt, isNull } from 'drizzle-orm';
import type { SQLiteSelect, SQLiteSelectBase } from 'drizzle-orm/sqlite-core';

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

/**
 * @type {import('../dist/types/yomitan/termbank').DetailedDefinition}
 */
const detailedDefinition = {
    type: 'structured-content',
    content: sc,
};

async function withPagination<T extends SQLiteSelect>(
    qb: T,
    startId: number,
    pageSize: number,
) {
    return await qb.where(gt(rEle.id, startId)).limit(pageSize);
}

async function queryEntries(dictionary: Dictionary) {
    const total = db.select()
        .from(entry)
        .all()
        .length
    const query = db
        .select()
        .from(rEle)
        .rightJoin(kEle, eq(rEle.entryId, kEle.entryId))
        .rightJoin(sense, eq(rEle.entryId, sense.entryId))
        .rightJoin(gloss, eq(sense.entryId, gloss.senseId))
        .orderBy(rEle.entryId)
        .$dynamic()
    var count = 0
    var countNullRele = 0
    while (count < total) {
        var element = (await withPagination(query, count, 1))[0]
        count++
        if(element == null) continue
        if(element.r_ele?.reb == null) continue
        const newTerm = new TermEntry(element.r_ele?.reb)
        if(element.gloss?.value != null)
            newTerm.addDetailedDefinition(element.gloss?.value)

        console.log(`Checked: ${count}/${total}`)
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
    await queryEntries(dictionary)
    await dictionary.export()
}

await buildYomitanDict()