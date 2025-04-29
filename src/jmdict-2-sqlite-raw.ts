import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
// import { jmdictEntityTable } from './db/jmdict-schemas'
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import { cwd } from 'process'
import { jmdictEntryTable, jmdictKeleTable } from './db/jmdict-schemas'

export function parseJmdictToSqliteRaw() {
    console.log('Parsing JMdict to SQLite raw...')
    const bufferXML = fs.readFileSync(`${cwd()}/${process.env.JMDICT_FILE_NAME}`);
    const parser = new XMLParser({
        htmlEntities: true,
        processEntities: true
    });
    let jObj = parser.parse(bufferXML);
    inputJmdictEntryToTable(jObj.JMdict.entry)
}

async function inputJmdictEntryToTable(rawEntries: any[])
{
    if (!process.env.DB_FILE_NAME) {
        throw new Error("Environment variable DB_FILE_NAME is not defined")
    }
    const db = drizzle(process.env.DB_FILE_NAME)
    await db.delete(jmdictEntryTable)

    const entries : typeof jmdictEntryTable.$inferInsert[] = rawEntries.map((entry : any) => {
        return {
            ent_seq: entry.ent_seq,
        }
    })
    await db.insert(jmdictEntryTable).values(entries)
}

async function parseJmdictKeleToTable(rawEntries: any[])
{
    if (!process.env.DB_FILE_NAME) {
        throw new Error("Environment variable DB_FILE_NAME is not defined")
    }
    const db = drizzle(process.env.DB_FILE_NAME)
    await db.delete(jmdictKeleTable)

    const keles : typeof jmdictKeleTable.$inferInsert[] = rawEntries.map((entry : any) => {
        return {       
            ent_seq: entry.ent_seq,
            keb: entry.keb,
        }
    })
    // await db.insert(jmdictEntryTable).values(keles)
}

async function inputJmdictKeleToTable(ent_seq: number, kele: any) {
    if (!process.env.DB_FILE_NAME) {
        throw new Error("Environment variable DB_FILE_NAME is not defined")
    }
    const db = drizzle(process.env.DB_FILE_NAME)
    await db.insert(jmdictKeleTable).values({
        ent_seq: ent_seq,
        keb: keb,
    })
}

parseJmdictToSqliteRaw();