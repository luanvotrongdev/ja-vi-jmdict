// Drizzle schema for JMdict derived structures.
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const entry = sqliteTable('entry', {
  id: int('id').primaryKey(),
  entSeq: int('ent_seq').notNull().unique(),
})

export const kEle = sqliteTable('k_ele', {
  id: int('id').primaryKey(),
  entryId: int('entry_id').notNull().references(() => entry.id, { onDelete: 'cascade' }),
  keb: text('keb').notNull(),
  position: int('position').notNull(),
})

export const keInf = sqliteTable('ke_inf', {
  id: int('id').primaryKey(),
  kEleId: int('k_ele_id').notNull().references(() => kEle.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const kePri = sqliteTable('ke_pri', {
  id: int('id').primaryKey(),
  kEleId: int('k_ele_id').notNull().references(() => kEle.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const rEle = sqliteTable('r_ele', {
  id: int('id').primaryKey(),
  entryId: int('entry_id').notNull().references(() => entry.id, { onDelete: 'cascade' }),
  reb: text('reb').notNull(),
  noKanji: text('re_nokanji'),
  position: int('position').notNull(),
})

export const reRestr = sqliteTable('re_restr', {
  id: int('id').primaryKey(),
  rEleId: int('r_ele_id').notNull().references(() => rEle.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const reInf = sqliteTable('re_inf', {
  id: int('id').primaryKey(),
  rEleId: int('r_ele_id').notNull().references(() => rEle.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const rePri = sqliteTable('re_pri', {
  id: int('id').primaryKey(),
  rEleId: int('r_ele_id').notNull().references(() => rEle.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const sense = sqliteTable('sense', {
  id: int('id').primaryKey(),
  entryId: int('entry_id').notNull().references(() => entry.id, { onDelete: 'cascade' }),
  senseIndex: int('sense_index').notNull(),
})

export const stagk = sqliteTable('stagk', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const stagr = sqliteTable('stagr', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const pos = sqliteTable('pos', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const xref = sqliteTable('xref', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const ant = sqliteTable('ant', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const field = sqliteTable('field', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const misc = sqliteTable('misc', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const senseInfo = sqliteTable('s_inf', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const lsource = sqliteTable('lsource', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value'),
  language: text('xml_lang'),
  sourceType: text('ls_type'),
  wasei: text('ls_wasei'),
  position: int('position').notNull(),
})

export const dial = sqliteTable('dial', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const gloss = sqliteTable('gloss', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  value: text('value'),
  language: text('xml_lang'),
  gender: text('g_gend'),
  glossType: text('g_type'),
  position: int('position').notNull(),
})

export const glossPriority = sqliteTable('gloss_pri', {
  id: int('id').primaryKey(),
  glossId: int('gloss_id').notNull().references(() => gloss.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const example = sqliteTable('example', {
  id: int('id').primaryKey(),
  senseId: int('sense_id').notNull().references(() => sense.id, { onDelete: 'cascade' }),
  source: text('ex_srce'),
  sourceType: text('exsrc_type'),
  termText: text('ex_text'),
  position: int('position').notNull(),
})

export const exampleSentence = sqliteTable('ex_sent', {
  id: int('id').primaryKey(),
  exampleId: int('example_id').notNull().references(() => example.id, { onDelete: 'cascade' }),
  language: text('xml_lang'),
  value: text('value').notNull(),
  position: int('position').notNull(),
})

export const rawWordCrawlJson = sqliteTable('raw_word_crawl_json', {
    id: int('id').primaryKey(),
    entryId: int('entry_id').notNull().references(() => entry.id, { onDelete: 'cascade' }),
    json: text('json').notNull(),
})

export const rawKanjiCrawlJson = sqliteTable('raw_kanji_crawl_json', {
    id: text('id').primaryKey(),
    json: text('json').notNull()
})