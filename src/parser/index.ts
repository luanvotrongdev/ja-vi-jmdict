import { getJmdict } from "@parser/utils";

let jmdict = await getJmdict()
if (!jmdict || !Array.isArray(jmdict)) {
    throw new Error("Failed to parse JMdict or it is not an array");
}   