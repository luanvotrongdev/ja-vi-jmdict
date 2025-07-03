import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import { 
    cleanJmdictTables, 
    parseJmdictToSqliteRaw, 
    inputJmdictChunksToTables 
} from './jmdict-preprocess'

if (!process.env.DB_FILE_NAME) {
    throw new Error("Environment variable DB_FILE_NAME is not defined")
}
const db = drizzle(process.env.DB_FILE_NAME)

await cleanJmdictTables(db)
let entries = await parseJmdictToSqliteRaw();
if (entries.length === 0) {
    console.log("No entries found in JMdict. Exiting...")
    process.exit(0)
}
let entry = entries[9]
console.log("Properties of entry:");
Object.keys(entries).forEach(key => {
    console.log(`key ${key} has value ${entries[Number.parseInt(key)]}`);
});
// await inputJmdictChunksToTables(db, entries, 900)