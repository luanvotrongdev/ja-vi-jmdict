import { 
    getJmdict, 
    traverseJmdict 
} from "traverse"

let jmdict = await getJmdict()
if (!jmdict) {
    throw new Error("Failed to parse JMdict or it is not an array")
}



traverseJmdict('jmdict', jmdict, (id) => {
    // Process each entry here
    // For example, you can log the entry or perform some operations
    console.log(`Processing entry ${id}`)
})