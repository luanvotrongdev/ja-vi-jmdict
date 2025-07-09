import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import { cwd } from 'process'

export type TraverseFunction = (id: string, entry: any, index: number) => void

export async function getJmdict(): Promise<any[]> {
    console.log('Parsing JMdict to SQLite raw...')
    const bufferXML = fs.readFileSync(`${cwd()}/${process.env.JMDICT_FILE_NAME}`)
    const parser = new XMLParser({
        htmlEntities: true,
        processEntities: true
    })
    let jObj = parser.parse(bufferXML)
    console.log('Done parsing JMdict to SQLite raw!')

    return jObj.JMdict
}

export function traverseJmdict(
    id: string,
    jmdict: any,
    callback: TraverseFunction
): void {
    if (typeof jmdict === 'string') {
        // Do nothing or handle string case if needed
        callback(id, jmdict, -1)
        return
    }
    if (Array.isArray(jmdict)) {
        traverseJmdictArray(id, jmdict, callback)
        return
    }
    if (typeof jmdict === 'object' && jmdict !== null) {
        traverseJmdictObject(id, jmdict, callback)
        return
    }
}

function traverseJmdictArray(
    id: string,
    jmdict: any[],
    callback: TraverseFunction
): void {
    for (let i = 0; i < jmdict.length; i++) {
        const entry = jmdict[i]
        traverseJmdict(id, entry, callback)
    }
}

export function traverseJmdictObject(
    id: string,
    jmdict: Record<string, any>,
    callback: TraverseFunction
): void {
    const ids : string[] = Object.keys(jmdict)
    for (let i = 0; i < ids.length; i++) {
        const childId : any = ids[i]
        if (typeof childId !== 'string') {
            continue // Skip non-string keys
        }
        const entry = jmdict[childId]
        traverseJmdict(`${id}_${childId}`, entry, callback)
    }
}