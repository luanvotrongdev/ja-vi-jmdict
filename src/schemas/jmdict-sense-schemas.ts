import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { jmdictEntryTable } from "./jmdict-entry-schemas";

export const jmdictSenseTable = sqliteTable("jmdict_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  ent_seq: int().references(() => jmdictEntryTable.ent_seq),
})

export const jmdictStagk_SenseTable = sqliteTable("jmdict_stagk_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  stagk: text().notNull(),
})

export const jmdictStagr_SenseTable = sqliteTable("jmdict_stagr_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  stagr: text().notNull(),
})

export const jmdictPos_SenseTable = sqliteTable("jmdict_pos_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  pos: text().notNull(),
})

export const jmdictXref_SenseTable = sqliteTable("jmdict_xref_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  xref: text().notNull(),
})

export const jmdictAnt_SenseTable = sqliteTable("jmdict_ant_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  ant: text().notNull(),
})

export const jmdictField_SenseTable = sqliteTable("jmdict_field_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  field: text().notNull(),
})

export const jmdictMisc_SenseTable = sqliteTable("jmdict_misc_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  misc: text().notNull(),
})

export const jmdictSinf_SenseTable = sqliteTable("jmdict_sinf_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  s_inf: text().notNull(),
})

export const jmdictLsource_SenseTable = sqliteTable("jmdict_lsource_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  lsource: text().notNull(),
})

export const jmdictDial_SenseTable = sqliteTable("jmdict_dial_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  dial: text().notNull(),
})

export const jmdictGloss_SenseTable = sqliteTable("jmdict_gloss_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  gloss: text().notNull(),
})

export const jmdictExample_SenseTable = sqliteTable("jmdict_example_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  sense_id: int().references(() => jmdictSenseTable.id),
  ex_srce: text().notNull(),
  ex_text: text().notNull(),
})

export const jmdictExSentences_SenseTable = sqliteTable("jmdict_ex_sentences_sense_table", {
  id: int().primaryKey({autoIncrement: true}),
  example_id: int().references(() => jmdictExample_SenseTable.id),
  ex_sentences: text().notNull(),
  lang: text()
})