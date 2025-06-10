import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jmdictEntryTable = sqliteTable("jmdict_entry_table", {
  ent_seq: int().primaryKey(),
})
