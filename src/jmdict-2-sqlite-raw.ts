import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import { cwd } from 'process'
import {
    jmdictEntryTable,
    jmdictKeInf_KeleTable,
    jmdictKePri_KeleTable,
    jmdictKeleTable,
    jmdictReInf_ReleTable,
    jmdictReRestr_ReleTable,
    jmdictRepri_ReleTable,
    jmdictReleTable
} from './db/jmdict-schemas'

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
    console.log('Done parsing JMdict to SQLite raw!')

    await inputJmdictChunksToTables(jObj.JMdict.entry, 900)
}

async function inputJmdictChunksToTables(rawEntries: any[], chunkSize: number) {
    console.log('Input JMdict Chunks Entries to SQLite...')
    var chunk: any[];
    for (let i = 0; i < rawEntries.length; i += chunkSize) {
        console.log(`Input JMdict Chunks Entries to SQLite... ${i} / ${rawEntries.length}`)
        chunk = rawEntries.slice(i, Math.min(i + chunkSize, rawEntries.length - 1))
        await inputJmdictEntryToTable(chunk)
        await inputJmdictKeleToTable(chunk)
        await inputJmdictReleToTable(chunk)
    }
    console.log('Done input JMdict Chunks Entries to SQLite!')
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
    console.log('Done input JMdict Entry to SQLite!')
}

function expandRawKeleToRows(ent_seq: number, kele_id: number, rawKele: any): {
    kele: typeof jmdictKeleTable.$inferInsert,
    raw_inf: typeof jmdictKeInf_KeleTable.$inferInsert[],
    raw_pri: typeof jmdictKePri_KeleTable.$inferInsert[],
} {
    var raw_inf: any[] = [];
    var raw_pri: any[] = [];
    var inf_count = 0
    var pri_count = 0
    if (rawKele.ke_inf !== undefined) {
        if (Array.isArray(rawKele.ke_inf)) {
            raw_inf = raw_inf.concat(rawKele.ke_inf).map((ke_inf: any) => {
                return {
                    kele_id: kele_id,
                    id: kele_id * 100 + inf_count++,
                    ke_inf: ke_inf
                }
            })
        }
        else {
            raw_inf.push({
                kele_id: kele_id,
                id: kele_id * 100 + inf_count,
                ke_inf: rawKele.ke_inf
            })
        }
    }

    if (rawKele.ke_pri !== undefined) {
        if (Array.isArray(rawKele.ke_pri)) {
            rawKele.ke_pri.forEach((ke_pri: any) => {
                raw_pri.push({
                    kele_id: kele_id,
                    id: kele_id * 100 + pri_count++,
                    ke_pri: ke_pri
                })
            })
        }
        else {
            raw_pri.push({
                kele_id: kele_id,
                id: kele_id * 100 + pri_count++,
                ke_pri: rawKele.ke_pri
            })
        }
    }
    return {
        kele: {
            ent_seq: ent_seq,
            id: kele_id,
            keb: rawKele.keb,
        },
        raw_inf: raw_inf,
        raw_pri: raw_pri
    }
}

function parseRawEntryKeles(entry: any): {
    keles: typeof jmdictKeleTable.$inferInsert[],
    k_inf: typeof jmdictKeInf_KeleTable.$inferInsert[],
    k_pri: typeof jmdictKePri_KeleTable.$inferInsert[],
} {
    var kele_cout = 0
    var keles: typeof jmdictKeleTable.$inferInsert[] = []
    var k_inf: typeof jmdictKeInf_KeleTable.$inferInsert[] = []
    var k_pri: typeof jmdictKePri_KeleTable.$inferInsert[] = []
    if (entry.k_ele === undefined) return null as any
    if (Array.isArray(entry.k_ele)) {
        entry.k_ele.forEach((raw_kele: any) => {
            const elements = expandRawKeleToRows(entry.ent_seq, entry.ent_seq * 100 + kele_cout, raw_kele);
            keles.push(elements.kele)
            k_inf = k_inf.concat(elements.raw_inf)
            k_pri = k_pri.concat(elements.raw_pri)
            kele_cout++
        })
    }
    else {
        const elements = expandRawKeleToRows(entry.ent_seq, entry.ent_seq * 100 + kele_cout, entry.k_ele);
        keles.push(elements.kele)
        k_inf = k_inf.concat(elements.raw_inf)
        k_pri = k_pri.concat(elements.raw_pri)
    }
    return {
        keles: keles,
        k_inf: k_inf,
        k_pri: k_pri
    }
}

async function inputJmdictKeleToTable(rawEntries: any[]) {
    var keles: typeof jmdictKeleTable.$inferInsert[] = []
    var k_inf: typeof jmdictKeInf_KeleTable.$inferInsert[] = []
    var k_pri: typeof jmdictKePri_KeleTable.$inferInsert[] = []

    rawEntries.forEach(entry => {
        const elements = parseRawEntryKeles(entry)
        if (elements) {
            keles = keles.concat(elements.keles)
            k_inf = k_inf.concat(elements.k_inf)
            k_pri = k_pri.concat(elements.k_pri)
        }
    })
    if (keles.length !== 0)
        await db.insert(jmdictKeleTable).values(keles)
    if (k_inf.length !== 0)
        await db.insert(jmdictKeInf_KeleTable).values(k_inf)
    if (k_pri.length !== 0)
        await db.insert(jmdictKePri_KeleTable).values(k_pri)
    console.log('Done input JMdict Keles to SQLite!')
}

function expandRawReleToRows(ent_seq: number, rele_id: number, rawRele: any): {
    rele: typeof jmdictReleTable.$inferInsert,
    re_restr: typeof jmdictReRestr_ReleTable.$inferInsert[],
    re_inf: typeof jmdictReInf_ReleTable.$inferInsert[],
    re_pri: typeof jmdictRepri_ReleTable.$inferInsert[]
} {
    var re_restr: any[] = [];
    var re_inf: any[] = [];
    var re_pri: any[] = [];
    var re_restr_count = 0
    var re_inf_count = 0
    var re_pri_count = 0

    if (rawRele.re_restr !== undefined) {
        if (Array.isArray(rawRele.re_restr)) {
            re_restr = re_restr.concat(rawRele.re_restr).map((re_restr: any) => {
                return {
                    rele_id: rele_id,
                    id: rele_id * 100 + re_restr_count++,
                    re_restr: re_restr
                }
            })
        }
        else {
            re_restr.push({
                rele_id: rele_id,
                id: rele_id * 100 + re_restr_count++,
                re_restr: rawRele.re_restr
            })
        }
    }
    if (rawRele.re_inf !== undefined) {
        if (Array.isArray(rawRele.re_inf)) {
            re_inf = re_inf.concat(rawRele.re_inf).map((inf: any) => {
                return {
                    rele_id: rele_id,
                    id: rele_id * 100 + re_inf_count++,
                    re_inf: inf
                }
            })
        }
        else {
            re_inf.push({
                rele_id: rele_id,
                id: rele_id * 100 + re_inf_count++,
                re_inf: rawRele.re_inf
            })
        }
    }
    if (rawRele.re_pri !== undefined) {
        if (Array.isArray(rawRele.re_pri)) {
            re_pri = re_pri.concat(rawRele.re_pri).map((re_pri: any) => {
                return {
                    rele_id: rele_id,
                    id: rele_id * 100 + re_pri_count++,
                    re_pri: re_pri
                }
            })
        }
        else {
            re_pri.push({
                rele_id: rele_id,
                id: rele_id * 100 + re_pri_count++,
                re_pri: rawRele.re_pri
            })
        }
    }
    return {
        rele: {
            ent_seq: ent_seq,
            id: rele_id,
            reb: rawRele.reb,
        },
        re_restr: re_restr,
        re_inf: re_inf,
        re_pri: re_pri
    }
}

function parseRawEntryReles(entry: any): {
    reles: typeof jmdictReleTable.$inferInsert[],
    re_restr: typeof jmdictReRestr_ReleTable.$inferInsert[],
    re_inf: typeof jmdictReInf_ReleTable.$inferInsert[],
    re_pri: typeof jmdictRepri_ReleTable.$inferInsert[]
} {
    var rele_cout = 0
    var reles: typeof jmdictReleTable.$inferInsert[] = []
    var re_restr: typeof jmdictReRestr_ReleTable.$inferInsert[] = []
    var re_inf: typeof jmdictReInf_ReleTable.$inferInsert[] = []
    var re_pri: typeof jmdictRepri_ReleTable.$inferInsert[] = []

    if (entry.r_ele === undefined) return null as any
    if (Array.isArray(entry.r_ele)) {
        entry.r_ele.forEach((raw_rele: any) => {
            const elements = expandRawReleToRows(entry.ent_seq, entry.ent_seq * 100 + rele_cout, raw_rele);
            reles.push(elements.rele)
            re_restr = re_restr.concat(elements.re_restr)
            re_inf = re_inf.concat(elements.re_inf)
            re_pri = re_pri.concat(elements.re_pri)
            rele_cout++
        })
    }
    else {
        const elements = expandRawReleToRows(entry.ent_seq, entry.ent_seq * 100 + rele_cout, entry.r_ele);
        reles.push(elements.rele)
        re_restr = re_restr.concat(elements.re_restr)
        re_inf = re_inf.concat(elements.re_inf)
        re_pri = re_pri.concat(elements.re_pri)
    }
    return {
        reles: reles,
        re_restr: re_restr,
        re_inf: re_inf,
        re_pri: re_pri
    }
}

async function inputJmdictReleToTable(rawEntries: any[]) {
    var reles: typeof jmdictReleTable.$inferInsert[] = []
    var re_restr: typeof jmdictReRestr_ReleTable.$inferInsert[] = []
    var re_inf: typeof jmdictReInf_ReleTable.$inferInsert[] = []
    var re_pri: typeof jmdictRepri_ReleTable.$inferInsert[] = []

    rawEntries.forEach(entry => {
        const elements = parseRawEntryReles(entry)
        if (elements) {
            reles = reles.concat(elements.reles)
            re_restr = re_restr.concat(elements.re_restr)
            re_inf = re_inf.concat(elements.re_inf)
            re_pri = re_pri.concat(elements.re_pri)
        }
    })
    if (reles.length !== 0)
        await db.insert(jmdictReleTable).values(reles)
    if (re_restr.length !== 0)
        await db.insert(jmdictReRestr_ReleTable).values(re_restr)
    if (re_inf.length !== 0)
        await db.insert(jmdictReInf_ReleTable).values(re_inf)
    if (re_pri.length !== 0)
        await db.insert(jmdictRepri_ReleTable).values(re_pri)
    console.log('Done input JMdict Reles to SQLite!')
}