import { 
    getJmdict, 
    traverseJmdict 
} from "traverse"

let jmdict = await getJmdict()
if (!jmdict) {
    throw new Error("Failed to parse JMdict or it is not an array")
}
