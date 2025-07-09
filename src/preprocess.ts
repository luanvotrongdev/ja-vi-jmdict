import { 
    getJmdict, 
    traverseJmdict 
} from "traverse"

let jmdict = await getJmdict()
if (!jmdict) {
    throw new Error("Failed to parse JMdict or it is not an array")
}

let idSet = new Set<string>()
traverseJmdict('jmdict', jmdict, idSet.add.bind(idSet))

if (idSet.size === 0) {
    throw new Error("No entries found in JMdict")
}
idSet.forEach((id) => {
    // Process each entry here
    // For example, you can log the entry or perform some operations
    console.log(`Processing entry ${id}`)
})