import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
    jmdictReInf_ReleTable,
    jmdictReleTable,
    jmdictRepri_ReleTable,
    jmdictReRestr_ReleTable
} from "../schemas";
import { parseChildXmlElement } from "./utils";


function expandRawReleToRows(ent_seq: number, rele_id: number, rawRele: any): {
    rele: typeof jmdictReleTable.$inferInsert,
    re_restr: typeof jmdictReRestr_ReleTable.$inferInsert[],
    re_inf: typeof jmdictReInf_ReleTable.$inferInsert[],
    re_pri: typeof jmdictRepri_ReleTable.$inferInsert[]
} {
    var re_restr: any[] = [];
    var re_inf: any[] = [];
    var re_pri: any[] = [];

    parseChildXmlElement(rawRele.re_restr, (ele, index) => {
        re_restr.push({
            rele_id: rele_id,
            id: rele_id * 100 + index,
            re_restr: ele
        })
    })
    parseChildXmlElement(rawRele.re_inf, (ele, index) => {
        re_inf.push({
            rele_id: rele_id,
            id: rele_id * 100 + index,
            re_inf: ele
        })
    })
    parseChildXmlElement(rawRele.re_pri, (ele, index) => {
        re_pri.push({
            rele_id: rele_id,
            id: rele_id * 100 + index,
            re_pri: ele
        })
    })
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
    var rele_count = 0
    var reles: typeof jmdictReleTable.$inferInsert[] = []
    var re_restr: typeof jmdictReRestr_ReleTable.$inferInsert[] = []
    var re_inf: typeof jmdictReInf_ReleTable.$inferInsert[] = []
    var re_pri: typeof jmdictRepri_ReleTable.$inferInsert[] = []

    parseChildXmlElement(entry.r_ele, (ele, index) => {
        const elements = expandRawReleToRows(entry.ent_seq, entry.ent_seq * 100 + index, ele);
        reles.push(elements.rele)
        re_restr = re_restr.concat(elements.re_restr)
        re_inf = re_inf.concat(elements.re_inf)
        re_pri = re_pri.concat(elements.re_pri)
        rele_count++
    })
    if (rele_count === 0) return null as any
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

    parseChildXmlElement(rawEntries, (ele, _) => {
        const elements = parseRawEntryReles(ele)
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