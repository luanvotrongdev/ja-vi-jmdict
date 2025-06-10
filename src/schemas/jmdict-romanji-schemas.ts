import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { jmdictEntryTable } from "./jmdict-entry-schemas";

//<!ELEMENT r_ele (reb, re_nokanji?, re_restr*, re_inf*, re_pri*)>
export const jmdictReleTable = sqliteTable("jmdict_rele_table", {
  id: int().primaryKey({autoIncrement: true}),
  ent_seq: int().references(() => jmdictEntryTable.ent_seq),
  reb: text().notNull()
})

export const jmdictReRestr_ReleTable = sqliteTable("jmdict_restr_rele_table", {
  id: int().primaryKey({ autoIncrement: true }),
  rele_id: int().references(() => jmdictReleTable.id),
  re_restr: text()
})

export const jmdictReInf_ReleTable = sqliteTable("jmdict_re_inf_rele_table", {
  id: int().primaryKey({ autoIncrement: true }),
  rele_id: int().references(() => jmdictReleTable.id),
  re_inf: text()
})

export const jmdictRepri_ReleTable = sqliteTable("jmdict_repri_rele_table", {
  id: int().primaryKey({ autoIncrement: true }),
  rele_id: int().references(() => jmdictReleTable.id),
  re_pri: text()
})