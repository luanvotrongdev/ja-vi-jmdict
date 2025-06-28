import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import { cwd, exit } from 'process'
import {
    jmdictEntryTable,
    jmdictKeInf_KeleTable,
    jmdictKePri_KeleTable,
    jmdictKeleTable,

    jmdictReInf_ReleTable,
    jmdictReRestr_ReleTable,
    jmdictRepri_ReleTable,
    jmdictReleTable,

    jmdictStagk_SenseTable,
    jmdictStagr_SenseTable,
    jmdictPos_SenseTable,
    jmdictXref_SenseTable,
    jmdictAnt_SenseTable,
    jmdictField_SenseTable,
    jmdictMisc_SenseTable,
    jmdictSinf_SenseTable,
    jmdictLsource_SenseTable,
    jmdictDial_SenseTable,
    jmdictGloss_SenseTable,
    jmdictSenseTable,
    jmdictExample_SenseTable,
    jmdictExSentences_SenseTable
} from '../schemas'
import { inputJmdictKeleToTable } from './jmdict-kanji-parser'
import inputJmdictEntryToTable from './jmdict-entry-parser'
import inputJmdictReleToTable from './jmdict-romanji-parser'
import inputJmdictSenseToTable from './jmdict-sense-parser'

if (!process.env.DB_FILE_NAME) {
    throw new Error("Environment variable DB_FILE_NAME is not defined")
}
const db = drizzle(process.env.DB_FILE_NAME)
await cleanJmdictTables()

let entries = await parseJmdictToSqliteRaw();
await inputJmdictChunksToTables(entries, 900)

export async function parseJmdictToSqliteRaw(): Promise<any[]> {
    console.log('Parsing JMdict to SQLite raw...')
    const bufferXML = fs.readFileSync(`${cwd()}/${process.env.JMDICT_FILE_NAME}`);
    const parser = new XMLParser({
        htmlEntities: true,
        processEntities: true
    });
    let jObj = parser.parse(bufferXML);
    console.log('Done parsing JMdict to SQLite raw!')

    return jObj.JMdict.entry
}

async function cleanJmdictTables() {
    console.log('Cleaning JMdict Tables...')
    await db.delete(jmdictKePri_KeleTable)
    await db.delete(jmdictKeInf_KeleTable)
    await db.delete(jmdictKeleTable)

    console.log('Cleaning JMdict Tables 2...')
    await db.delete(jmdictRepri_ReleTable)
    await db.delete(jmdictReInf_ReleTable)
    await db.delete(jmdictReRestr_ReleTable)
    await db.delete(jmdictReleTable)

    console.log('Cleaning JMdict Tables 3...')
    await db.delete(jmdictStagk_SenseTable)
    await db.delete(jmdictStagr_SenseTable)
    await db.delete(jmdictPos_SenseTable)
    await db.delete(jmdictXref_SenseTable)
    await db.delete(jmdictAnt_SenseTable)
    await db.delete(jmdictField_SenseTable)
    await db.delete(jmdictMisc_SenseTable)
    await db.delete(jmdictSinf_SenseTable)
    await db.delete(jmdictLsource_SenseTable)
    await db.delete(jmdictDial_SenseTable)
    await db.delete(jmdictGloss_SenseTable)
    await db.delete(jmdictExample_SenseTable)
    await db.delete(jmdictExSentences_SenseTable)
    await db.delete(jmdictSenseTable)

    console.log('Cleaning JMdict Tables 4...')
    await db.delete(jmdictEntryTable)
    console.log('Done cleaning JMdict Tables!')
}

async function inputJmdictChunksToTables(rawEntries: any[], chunkSize: number) {
    let entryCount = rawEntries.length;
    console.log(`JMdict entries count: ${entryCount}`)
    if (entryCount === 0) exit
    var chunk: any[];
    for (let i = 0; i < rawEntries.length; i += chunkSize) {
        console.log(`Input JMdict Chunks Entries to SQLite...`)
        chunk = rawEntries.slice(i, Math.min(i + chunkSize, rawEntries.length - 1))
        await inputJmdictEntryToTable(db, chunk)
        await inputJmdictKeleToTable(db, chunk)
        await inputJmdictReleToTable(db, chunk)
        await inputJmdictSenseToTable(db, chunk)
        console.log(`Input JMdict Chunks Entries to SQLite: ${i + chunkSize} / ${entryCount}`)
    }
    console.log('Done input JMdict Chunks Entries to SQLite!')
}