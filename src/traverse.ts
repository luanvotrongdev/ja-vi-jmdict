export class SchemaNode
{
    public parent : SchemaNode | null = null
    public id : string
    public children : SchemaNode[] = []

    public constructor(id:string)
    {
        this.id = id
    }

    public addChild(childId : string)
    {
        for(var i=0;i<this.children.length;i++)
        {
            if(this.children[i]?.id !== childId) continue
            return
        }

        const child= new SchemaNode(childId)
        child.parent = this
        this.children.push(child)
    }
}

export function traverseJmdict(
    keyList: string[],
    jmdict: any
): void {
    if(typeof jmdict === "string") return
    if (Array.isArray(jmdict)) {
       console.log(keyList.join('||') + " [array]")
        jmdict.forEach((entry: any) => {
            traverseJmdict(keyList, entry)
        })
        return
    }
    if (typeof jmdict === 'object') {
       console.log(keyList.join('||') + " [object]")
        let keys = Object.keys(jmdict)
        keys.forEach(key => {
            traverseJmdict([...keyList].concat(key), jmdict[key])
        })
        return
    }
}

export class Node {
    public parent: Node | null = null
    public children: Node[] = []
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

    public getFullId(): string[] {
        return this._getFullId([])
    }

    private _getFullId(idStacks: string[]): string[] {
        if (this.type !== 'array')
            idStacks.push(this.id)

        if (this.parent === null)
            return idStacks.filter(x => x.length > 0).reverse()

        return this.parent._getFullId(idStacks)
    }
}