import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { 
    jmdictSenseTable, 
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
} from "../schemas";
import { parseChildXmlElement } from "./utils";


function expandRawSenseToRows(ent_seq: number, sense_id: number, rawSense: any): {
    sense: typeof jmdictSenseTable.$inferInsert,
    stagk: typeof jmdictStagk_SenseTable.$inferInsert[],
    stagr: typeof jmdictStagr_SenseTable.$inferInsert[],
    pos: typeof jmdictPos_SenseTable.$inferInsert[],
    xref: typeof jmdictXref_SenseTable.$inferInsert[],
    ant: typeof jmdictAnt_SenseTable.$inferInsert[],
    field: typeof jmdictField_SenseTable.$inferInsert[],
    misc: typeof jmdictMisc_SenseTable.$inferInsert[],
    sinf: typeof jmdictSinf_SenseTable.$inferInsert[],
    dial: typeof jmdictDial_SenseTable.$inferInsert[],
    // lsource: typeof jmdictLsource_SenseTable.$inferInsert[],
    // gloss: typeof jmdictGloss_SenseTable.$inferInsert[]
} {
    var stagk: any[] = [];
    var stagr: any[] = [];
    var pos: any[] = [];
    var xref: any[] = [];
    var ant: any[] = [];
    var field: any[] = [];
    var misc: any[] = [];
    var sinf: any[] = [];
    var dial: any[] = [];
    // var lsource: any[] = [];
    // var gloss: any[] = [];

    parseChildXmlElement(rawSense.stagk, (ele, index) => {
            stagk.push({
                sense_id: sense_id,
                id: sense_id * 100 + index,
                stagk: ele
            })
        })
    parseChildXmlElement(rawSense.stagr, (ele, index) => {
            stagr.push({
                sense_id: sense_id,
                id: sense_id * 100 + index,
                stagr: ele
            })
        })
    parseChildXmlElement(rawSense.pos, (ele, index) => {
            pos.push({
                sense_id: sense_id,
                id: sense_id * 100 + index,
                pos: ele
            })
        })
    parseChildXmlElement(rawSense.xref, (ele, index) => {
            xref.push({
                sense_id: sense_id,
                id: sense_id * 100 + index,
                xref: ele
            })
        })
    parseChildXmlElement(rawSense.ant, (ele, index) => {
            ant.push({
                sense_id: sense_id,
                id: sense_id * 100 + index,
                ant: ele
            })
        })
    parseChildXmlElement(rawSense.field, (ele, index) => {
            field.push({
                sense_id: sense_id,
                id: sense_id * 100 + index,
                field: ele
            })
        })
    parseChildXmlElement(rawSense.misc, (ele, index) => {
            misc.push({
                sense_id: sense_id,
                id: sense_id * 100 + index,
                misc: ele
            })
        })
    parseChildXmlElement(rawSense.sinf, (ele, index) => {
            sinf.push({
                sense_id: sense_id,
                id: sense_id * 100 + index,
                sinf: ele
            })
        })
    parseChildXmlElement(rawSense.dial, (ele, index) => {
            dial.push({
                sense_id: sense_id,
                id: sense_id * 100 + index,
                dial: ele
            })
        })
    return {
        sense: {
            ent_seq: ent_seq,
            id: sense_id,
        },
        stagk: stagk,
        stagr: stagr,
        pos: pos,
        xref: xref,
        ant: ant,
        field: field,
        misc: misc,
        sinf: sinf,
        dial: dial,
    }
}

function parseRawEntryReles(entry: any): {
    sense: typeof jmdictSenseTable.$inferInsert[],
    stagk: typeof jmdictStagk_SenseTable.$inferInsert[],
    stagr: typeof jmdictStagr_SenseTable.$inferInsert[],
    pos: typeof jmdictPos_SenseTable.$inferInsert[],
    xref: typeof jmdictXref_SenseTable.$inferInsert[],
    ant: typeof jmdictAnt_SenseTable.$inferInsert[],
    field: typeof jmdictField_SenseTable.$inferInsert[],
    misc: typeof jmdictMisc_SenseTable.$inferInsert[],
    sinf: typeof jmdictSinf_SenseTable.$inferInsert[],
    dial: typeof jmdictDial_SenseTable.$inferInsert[],
} {
    var sense_count = 0
    var sense: typeof jmdictSenseTable.$inferInsert[] = []
    var stagk: typeof jmdictStagk_SenseTable.$inferInsert[] = []
    var stagr: typeof jmdictStagr_SenseTable.$inferInsert[] = []
    var pos: typeof jmdictPos_SenseTable.$inferInsert[] = []
    var xref: typeof jmdictXref_SenseTable.$inferInsert[] = []
    var ant: typeof jmdictAnt_SenseTable.$inferInsert[] = []
    var field: typeof jmdictField_SenseTable.$inferInsert[] = []
    var misc: typeof jmdictMisc_SenseTable.$inferInsert[] = []
    var sinf: typeof jmdictSinf_SenseTable.$inferInsert[] = []
    var dial: typeof jmdictDial_SenseTable.$inferInsert[] = []

    parseChildXmlElement(entry.sense, (ele, index) => {
        const elements = expandRawSenseToRows(entry.ent_seq, entry.ent_seq * 100 + index, ele);
        sense.push(elements.sense)
        stagk = stagk.concat(elements.stagk)
        stagr = stagr.concat(elements.stagr)
        pos = pos.concat(elements.pos)
        xref = xref.concat(elements.xref)
        ant = ant.concat(elements.ant)
        field = field.concat(elements.field)
        misc = misc.concat(elements.misc)
        sinf = sinf.concat(elements.sinf)
        dial = dial.concat(elements.dial)
        sense_count++
    })

    if (sense_count === 0) return null as any
    
    return {
        sense: sense,
        stagk: stagk,
        stagr: stagr,
        pos: pos,
        xref: xref,
        ant: ant,
        field: field,
        misc: misc,
        sinf: sinf,
        dial: dial,
    }
}

export default async function inputJmdictSenseToTable(db: LibSQLDatabase, rawEntries: any[]) {
    var sense: typeof jmdictSenseTable.$inferInsert[] = []
    var stagk: typeof jmdictStagk_SenseTable.$inferInsert[] = []
    var stagr: typeof jmdictStagr_SenseTable.$inferInsert[] = []
    var pos: typeof jmdictPos_SenseTable.$inferInsert[] = []
    var xref: typeof jmdictXref_SenseTable.$inferInsert[] = []
    var ant: typeof jmdictAnt_SenseTable.$inferInsert[] = []
    var field: typeof jmdictField_SenseTable.$inferInsert[] = []
    var misc: typeof jmdictMisc_SenseTable.$inferInsert[] = []
    var sinf: typeof jmdictSinf_SenseTable.$inferInsert[] = []
    var dial: typeof jmdictDial_SenseTable.$inferInsert[] = []

    rawEntries.forEach(entry => {
        const elements = parseRawEntryReles(entry)
        if (elements) {
            sense = sense.concat(elements.sense)
            stagk = stagk.concat(elements.stagk)
            stagr = stagr.concat(elements.stagr)
            pos = pos.concat(elements.pos)
            xref = xref.concat(elements.xref)
            ant = ant.concat(elements.ant)
            field = field.concat(elements.field)
            misc = misc.concat(elements.misc)
            sinf = sinf.concat(elements.sinf)
            dial = dial.concat(elements.dial)
        }
    })
    if (sense.length > 0) {
        await db.insert(jmdictSenseTable).values(sense);
    }
    if (stagk.length > 0) {
        await db.insert(jmdictStagk_SenseTable).values(stagk);
    }
    if (stagr.length > 0) {
        await db.insert(jmdictStagr_SenseTable).values(stagr);
    }
    if (pos.length > 0) {
        await db.insert(jmdictPos_SenseTable).values(pos);
    }
    if (xref.length > 0) {
        await db.insert(jmdictXref_SenseTable).values(xref);
    }
    if (ant.length > 0) {
        await db.insert(jmdictAnt_SenseTable).values(ant);
    }
    if (field.length > 0) {
        await db.insert(jmdictField_SenseTable).values(field);
    }
    if (misc.length > 0) {
        await db.insert(jmdictMisc_SenseTable).values(misc);
    }
    if (sinf.length > 0) {
        await db.insert(jmdictSinf_SenseTable).values(sinf);
    }
    if (dial.length > 0) {
        await db.insert(jmdictDial_SenseTable).values(dial);
    }
    console.log('Done input JMdict Senses to SQLite!')
}