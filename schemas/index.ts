import { sqliteTable, AnySQLiteColumn, foreignKey, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const ant = sqliteTable("ant", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const dial = sqliteTable("dial", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const entry = sqliteTable("entry", {
	id: integer().primaryKey().notNull(),
	entSeq: integer("ent_seq").notNull(),
},
(table) => [
	uniqueIndex("entry_ent_seq_unique").on(table.entSeq),
]);

export const example = sqliteTable("example", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	exSrce: text("ex_srce"),
	exsrcType: text("exsrc_type"),
	exText: text("ex_text"),
	position: integer().notNull(),
});

export const exSent = sqliteTable("ex_sent", {
	id: integer().primaryKey().notNull(),
	exampleId: integer("example_id").notNull().references(() => example.id, { onDelete: "cascade" } ),
	xmlLang: text("xml_lang"),
	value: text().notNull(),
	position: integer().notNull(),
});

export const field = sqliteTable("field", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const gloss = sqliteTable("gloss", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text(),
	xmlLang: text("xml_lang"),
	gGend: text("g_gend"),
	gType: text("g_type"),
	position: integer().notNull(),
});

export const glossPri = sqliteTable("gloss_pri", {
	id: integer().primaryKey().notNull(),
	glossId: integer("gloss_id").notNull().references(() => gloss.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const kEle = sqliteTable("k_ele", {
	id: integer().primaryKey().notNull(),
	entryId: integer("entry_id").notNull().references(() => entry.id, { onDelete: "cascade" } ),
	keb: text().notNull(),
	position: integer().notNull(),
});

export const keInf = sqliteTable("ke_inf", {
	id: integer().primaryKey().notNull(),
	kEleId: integer("k_ele_id").notNull().references(() => kEle.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const kePri = sqliteTable("ke_pri", {
	id: integer().primaryKey().notNull(),
	kEleId: integer("k_ele_id").notNull().references(() => kEle.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const lsource = sqliteTable("lsource", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text(),
	xmlLang: text("xml_lang"),
	lsType: text("ls_type"),
	lsWasei: text("ls_wasei"),
	position: integer().notNull(),
});

export const misc = sqliteTable("misc", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const pos = sqliteTable("pos", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const rEle = sqliteTable("r_ele", {
	id: integer().primaryKey().notNull(),
	entryId: integer("entry_id").notNull().references(() => entry.id, { onDelete: "cascade" } ),
	reb: text().notNull(),
	reNokanji: text("re_nokanji"),
	position: integer().notNull(),
});

export const reInf = sqliteTable("re_inf", {
	id: integer().primaryKey().notNull(),
	rEleId: integer("r_ele_id").notNull().references(() => rEle.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const rePri = sqliteTable("re_pri", {
	id: integer().primaryKey().notNull(),
	rEleId: integer("r_ele_id").notNull().references(() => rEle.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const reRestr = sqliteTable("re_restr", {
	id: integer().primaryKey().notNull(),
	rEleId: integer("r_ele_id").notNull().references(() => rEle.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const sense = sqliteTable("sense", {
	id: integer().primaryKey().notNull(),
	entryId: integer("entry_id").notNull().references(() => entry.id, { onDelete: "cascade" } ),
	senseIndex: integer("sense_index").notNull(),
});

export const sInf = sqliteTable("s_inf", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const stagk = sqliteTable("stagk", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const stagr = sqliteTable("stagr", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const xref = sqliteTable("xref", {
	id: integer().primaryKey().notNull(),
	senseId: integer("sense_id").notNull().references(() => sense.id, { onDelete: "cascade" } ),
	value: text().notNull(),
	position: integer().notNull(),
});

export const rawWordCrawlJson = sqliteTable("raw_word_crawl_json", {
	id: integer().primaryKey().notNull(),
	entryId: integer("entry_id").notNull().references(() => entry.id, { onDelete: "cascade" } ),
	json: text().notNull(),
});

export const rawKanjiCrawlJson = sqliteTable("raw_kanji_crawl_json", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	textId: text(),
	json: text().notNull(),
},
(table) => [
	uniqueIndex("raw_kanji_crawl_json_textId_unique").on(table.textId),
]);

