import 'dotenv/config'
import path from 'path'
import { Dictionary, DictionaryIndex } from "yomichan-dict-builder";
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

async function withPagination<T extends SQLiteSelect>(
	qb: T,
	startId: number,
	pageSize: number,
) {
	return await qb.where(gt(entry.id, startId)).limit(pageSize);
}

async function queryEntries()
{
    const total = db.select()
        .from(entry)
        .all()
        .length
    const query = db
                .select()
                .from(entry)
                .rightJoin(rEle, eq(entry.id, rEle.entryId))
                .orderBy(entry.id)
                .$dynamic()
    var count = 0
    var countNullRele = 0
    while(count <　total)
    {
        var element = (await withPagination(query, count, 1))[0]
        count++
        if(element == null) break
        if(element.r_ele.reb == null || element.r_ele.reb.length == 0)
            countNullRele++
        console.log(`Checked: ${count}/${total} id: ${element.entry?.id} rele null: ${countNullRele}`)
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
    await dictionary.export()
}

queryEntries()