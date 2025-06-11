import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
    jmdictKeInf_KeleTable,
    jmdictKeleTable,
    jmdictKePri_KeleTable
} from "../schemas";
import { parseChildXmlElement } from "./utils";


function expandRawKeleToRows(ent_seq: number, kele_id: number, rawKele: any): {
    kele: typeof jmdictKeleTable.$inferInsert,
    raw_inf: typeof jmdictKeInf_KeleTable.$inferInsert[],
    raw_pri: typeof jmdictKePri_KeleTable.$inferInsert[],
} {
    var raw_inf: any[] = [];
    var raw_pri: any[] = [];
    parseChildXmlElement(rawKele.ke_inf, (ele, index) => {
        raw_inf.push({
            kele_id: kele_id,
            id: kele_id * 100 + index,
            ke_inf: ele
        })
    })
    parseChildXmlElement(rawKele.raw_pri, (ele, index) => {
        raw_pri.push({
            kele_id: kele_id,
            id: kele_id * 100 + index,
            raw_pri: ele
        })
    })
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
    var kele_count = 0
    var keles: typeof jmdictKeleTable.$inferInsert[] = []
    var k_inf: typeof jmdictKeInf_KeleTable.$inferInsert[] = []
    var k_pri: typeof jmdictKePri_KeleTable.$inferInsert[] = []

    parseChildXmlElement(entry.k_ele, (ele, index) => {
        const elements = expandRawKeleToRows(entry.ent_seq, entry.ent_seq * 100 + index, ele);
        keles.push(elements.kele)
        k_inf = k_inf.concat(elements.raw_inf)
        k_pri = k_pri.concat(elements.raw_pri)
        kele_count = index + 1
    })
    if (kele_count === 0) return null as any

    return {
        keles: keles,
        k_inf: k_inf,
        k_pri: k_pri
    }
}

export async function inputJmdictKeleToTable(db: LibSQLDatabase, rawEntries: any[]) {
    var keles: typeof jmdictKeleTable.$inferInsert[] = []
    var k_inf: typeof jmdictKeInf_KeleTable.$inferInsert[] = []
    var k_pri: typeof jmdictKePri_KeleTable.$inferInsert[] = []

    parseChildXmlElement(rawEntries, (ele, _) => {
        const elements = parseRawEntryKeles(ele)
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