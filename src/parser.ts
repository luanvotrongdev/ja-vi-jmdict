import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import { cwd } from 'process'

export async function getJmdict(): Promise<any> {
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