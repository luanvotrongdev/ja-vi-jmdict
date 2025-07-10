import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import { cwd } from 'process'

export const SEPARATOR = '||'

export type TraverseFunction = (node: Node) => void

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

export function traverseJmdict(
    node: Node,
    callback: TraverseFunction
): void {
    callback(node)
    if (node.type ==='object') {
        let keys = Object.keys(node.value)
        keys.forEach(key => {
           traverseJmdict(new Node(key, node.value[key]), callback) 
        })
        return
    }
    if(node.type === 'array')
    {
        node.value.forEach((entry : any) => {
            const childNode = new Node(node.id, entry)
            traverseJmdict(childNode, callback)
        })
        return
    }
}

export class Node {
    public parent: Node | null = null
    public children : Node[] = []
    public id: string
    public value: any
    public type: string

    public constructor(id: string, value: any) {
        this.id = id
        this.value = value 
        if (Array.isArray(value)) {
            this.type = 'array'
        } else {
            this.type = typeof value
        }
    }

    public push(id: string, node: Node): void {
        node.parent = this
        node.id = id
        this.children.push(node)
    }

    public getFullId(idStacks: string[]): string[]
    {
        idStacks.push(this.id)

        if(this.parent === null)
            return idStacks.reverse()

        return this.parent.getFullId(idStacks)
    }
}