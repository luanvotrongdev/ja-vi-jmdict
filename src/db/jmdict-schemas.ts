import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jmdictEntityTable = sqliteTable("jmdict_entity_table", {
  id: text().primaryKey(),
  english: text(),
  vietnamese: text()
})

export const jmdictEntryTable = sqliteTable("jmdict_entry_table", {
  ent_seq: int().primaryKey(),
})

export const jmdictKeleTable = sqliteTable("jmdict_kele_table", {
  id: int().primaryKey(),
  ent_seq: int().references(() => jmdictEntryTable.ent_seq, { onDelete: "cascade" }),
  keb: text().notNull(),
})

export const jmdictKeInf_KeleTable = sqliteTable("jmdict_ke_inf_kele_table", {
  id: int().primaryKey({ autoIncrement: true }),
  kele_id: int().references(() => jmdictKeleTable.id, { onDelete: "cascade" }),
  ke_inf: text()
})

export const jmdictKePri_KeleTable = sqliteTable("jmdict_ke_pri_kele_table", {
  id: int().primaryKey({ autoIncrement: true }),
  kele_id: int().references(() => jmdictKeleTable.id, { onDelete: "cascade" }),
  ke_pri: text()
})

export const jmdictReleTable = sqliteTable("jmdict_rele_table", {
  id: int().primaryKey({autoIncrement: true}),
  ent_seq: int().references(() => jmdictEntryTable.ent_seq, { onDelete: "cascade" }),
  reb: text().notNull(),
  re_nokanji: text().notNull(),
  re_restr: text().notNull(),
  re_pri: text()
})

export const jmdictSenseTable = sqliteTable("jmdict_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  ent_seq: int().references(() => jmdictEntryTable.ent_seq, { onDelete: "cascade" }),
})

export const jmdictStagk_SenseTable = sqliteTable("jmdict_stagk_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  stagk: text().notNull(),
})

export const jmdictStagr_SenseTable = sqliteTable("jmdict_stagr_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  stagr: text().notNull(),
})

export const jmdictPos_SenseTable = sqliteTable("jmdict_pos_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  pos: text().notNull(),
})

export const jmdictXref_SenseTable = sqliteTable("jmdict_xref_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  xref: text().notNull(),
})

export const jmdictAnt_SenseTable = sqliteTable("jmdict_ant_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  ant: text().notNull(),
})

export const jmdictField_SenseTable = sqliteTable("jmdict_field_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  field: text().notNull(),
})

export const jmdictMisc_SenseTable = sqliteTable("jmdict_misc_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  misc: text().notNull(),
})

export const jmdictSinf_SenseTable = sqliteTable("jmdict_sinf_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  s_inf: text().notNull(),
})

export const jmdictLsource_SenseTable = sqliteTable("jmdict_lsource_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  lsource: text().notNull(),
})

export const jmdictDial_SenseTable = sqliteTable("jmdict_dial_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  dial: text().notNull(),
})

export const jmdictGloss_SenseTable = sqliteTable("jmdict_gloss_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  gloss: text().notNull(),
})

export const jmdictExample_SenseTable = sqliteTable("jmdict_example_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id, { onDelete: "cascade" }),
  ex_srce: text().notNull(),
  ex_text: text().notNull(),
})

export const jmdictExSentences_SenseTable = sqliteTable("jmdict_ex_sentences_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  example_id: int().references(() => jmdictExample_SenseTable.id, { onDelete: "cascade" }),
  ex_sentences: text().notNull(),
  lang: text()
})