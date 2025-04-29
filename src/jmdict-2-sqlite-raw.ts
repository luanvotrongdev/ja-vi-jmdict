import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
// import { jmdictEntityTable } from './db/jmdict-schemas'
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import { cwd } from 'process'
import { jmdictEntryTable, jmdictKeleTable } from './db/jmdict-schemas'

if (!process.env.DB_FILE_NAME) {
    throw new Error("Environment variable DB_FILE_NAME is not defined")
}
const db = drizzle(process.env.DB_FILE_NAME)
await parseJmdictToSqliteRaw();

export async function parseJmdictToSqliteRaw() {
    console.log('Parsing JMdict to SQLite raw...')
    const bufferXML = fs.readFileSync(`${cwd()}/${process.env.JMDICT_FILE_NAME}`);
    const parser = new XMLParser({
        htmlEntities: true,
        processEntities: true
    });
    let jObj = parser.parse(bufferXML);
    await inputJmdictEntryToTable(jObj.JMdict.entry)
    await inputJmdictKeleToTable(jObj.JMdict.entry)
}

async function inputJmdictEntryToTable(rawEntries: any[]) {
    console.log('Input JMdict Entry to SQLite...')
    await db.delete(jmdictEntryTable)
    const entries: typeof jmdictEntryTable.$inferInsert[] = rawEntries.map((entry: any) => {
        return {
            ent_seq: entry.ent_seq,
        }
    })
    await db.insert(jmdictEntryTable).values(entries)
}

function parseRawKeleToKeleRow(ent_seq: number, kele : any) : typeof jmdictKeleTable.$inferInsert
{
    return {
        ent_seq: ent_seq,
        keb: kele.keb,
        ke_inf: kele.ke_inf? kele.ke_inf : null,
        ke_pri: kele.ke_pri? kele.ke_pri : null,
    }
}

function parseRawEntryToKeles(entry : any) : typeof jmdictKeleTable.$inferInsert[]{
    const keles : typeof jmdictKeleTable.$inferInsert[] = []
    if(!entry.k_ele) return []
    if(Array.isArray(entry.k_ele)) {
        entry.k_ele.forEach((kele: any) => {
            keles.push(parseRawKeleToKeleRow(entry.ent_seq, kele))
        })
        return keles
    }
    
    keles.push(parseRawKeleToKeleRow(entry.ent_seq, entry.k_ele))
    return keles
}

async function inputJmdictKeleToTable(rawEntries: any[]) {
    console.log('Input JMdict Keles to SQLite...')
    var keles : typeof jmdictKeleTable.$inferInsert[] = []

    rawEntries.forEach(entry => {
        keles = keles.concat(parseRawEntryToKeles(entry))
    })
    await db.insert(jmdictKeleTable).values(keles)
}