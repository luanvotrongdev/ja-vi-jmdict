import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { jmdictReInf_ReleTable, jmdictReleTable, jmdictRepri_ReleTable, jmdictReRestr_ReleTable } from "../schemas";


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

export default async function inputJmdictReleToTable(db: LibSQLDatabase, rawEntries: any[]) {
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