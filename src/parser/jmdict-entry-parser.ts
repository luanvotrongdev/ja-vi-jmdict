import type { LibSQLDatabase } from "drizzle-orm/libsql"
import { jmdictEntryTable } from "../schemas"


export default async function inputJmdictEntryToTable(db: LibSQLDatabase, rawEntries: any[]) {
    console.log('Input JMdict Entry to SQLite...')
    const entries: typeof jmdictEntryTable.$inferInsert[] = rawEntries.map((entry: any) => {
        return {
            ent_seq: entry.ent_seq,
        }
    })
    await db.insert(jmdictEntryTable).values(entries)
    console.log('Done input JMdict Entry to SQLite!')
}