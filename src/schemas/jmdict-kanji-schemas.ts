import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { jmdictEntryTable } from "./jmdict-entry-schemas";

//<!ELEMENT k_ele (keb, ke_inf*, ke_pri*)>
export const jmdictKeleTable = sqliteTable("jmdict_kele_table", {
  id: int().primaryKey(),
  ent_seq: int().references(() => jmdictEntryTable.ent_seq),
  keb: text().notNull(),
})

export const jmdictKeInf_KeleTable = sqliteTable("jmdict_ke_inf_kele_table", {
  id: int().primaryKey({ autoIncrement: true }),
  kele_id: int().references(() => jmdictKeleTable.id),
  ke_inf: text()
})

export const jmdictKePri_KeleTable = sqliteTable("jmdict_ke_pri_kele_table", {
  id: int().primaryKey({ autoIncrement: true }),
  kele_id: int().references(() => jmdictKeleTable.id),
  ke_pri: text()
})