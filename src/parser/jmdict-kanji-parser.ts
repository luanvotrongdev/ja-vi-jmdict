import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { 
    jmdictKeInf_KeleTable, 
    jmdictKeleTable, 
    jmdictKePri_KeleTable 
} from "../schemas";


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

export async function inputJmdictKeleToTable(db : LibSQLDatabase, rawEntries: any[]) {
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