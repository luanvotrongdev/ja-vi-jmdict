import { relations } from "drizzle-orm/relations";
import { sense, ant, dial, example, exSent, field, gloss, glossPri, entry, kEle, keInf, kePri, lsource, misc, pos, rEle, reInf, rePri, reRestr, sInf, stagk, stagr, xref, rawWordCrawlJson } from "./schema";

export const antRelations = relations(ant, ({one}) => ({
	sense: one(sense, {
		fields: [ant.senseId],
		references: [sense.id]
	}),
}));

export const senseRelations = relations(sense, ({one, many}) => ({
	ants: many(ant),
	dials: many(dial),
	examples: many(example),
	fields: many(field),
	glosses: many(gloss),
	lsources: many(lsource),
	miscs: many(misc),
	pos: many(pos),
	entry: one(entry, {
		fields: [sense.entryId],
		references: [entry.id]
	}),
	sInfs: many(sInf),
	stagks: many(stagk),
	stagrs: many(stagr),
	xrefs: many(xref),
}));

export const dialRelations = relations(dial, ({one}) => ({
	sense: one(sense, {
		fields: [dial.senseId],
		references: [sense.id]
	}),
}));

export const exampleRelations = relations(example, ({one, many}) => ({
	sense: one(sense, {
		fields: [example.senseId],
		references: [sense.id]
	}),
	exSents: many(exSent),
}));

export const exSentRelations = relations(exSent, ({one}) => ({
	example: one(example, {
		fields: [exSent.exampleId],
		references: [example.id]
	}),
}));

export const fieldRelations = relations(field, ({one}) => ({
	sense: one(sense, {
		fields: [field.senseId],
		references: [sense.id]
	}),
}));

export const glossRelations = relations(gloss, ({one, many}) => ({
	sense: one(sense, {
		fields: [gloss.senseId],
		references: [sense.id]
	}),
	glossPris: many(glossPri),
}));

export const glossPriRelations = relations(glossPri, ({one}) => ({
	gloss: one(gloss, {
		fields: [glossPri.glossId],
		references: [gloss.id]
	}),
}));

export const kEleRelations = relations(kEle, ({one, many}) => ({
	entry: one(entry, {
		fields: [kEle.entryId],
		references: [entry.id]
	}),
	keInfs: many(keInf),
	kePris: many(kePri),
}));

export const entryRelations = relations(entry, ({many}) => ({
	kEles: many(kEle),
	rEles: many(rEle),
	senses: many(sense),
	rawWordCrawlJsons: many(rawWordCrawlJson),
}));

export const keInfRelations = relations(keInf, ({one}) => ({
	kEle: one(kEle, {
		fields: [keInf.kEleId],
		references: [kEle.id]
	}),
}));

export const kePriRelations = relations(kePri, ({one}) => ({
	kEle: one(kEle, {
		fields: [kePri.kEleId],
		references: [kEle.id]
	}),
}));

export const lsourceRelations = relations(lsource, ({one}) => ({
	sense: one(sense, {
		fields: [lsource.senseId],
		references: [sense.id]
	}),
}));

export const miscRelations = relations(misc, ({one}) => ({
	sense: one(sense, {
		fields: [misc.senseId],
		references: [sense.id]
	}),
}));

export const posRelations = relations(pos, ({one}) => ({
	sense: one(sense, {
		fields: [pos.senseId],
		references: [sense.id]
	}),
}));

export const rEleRelations = relations(rEle, ({one, many}) => ({
	entry: one(entry, {
		fields: [rEle.entryId],
		references: [entry.id]
	}),
	reInfs: many(reInf),
	rePris: many(rePri),
	reRestrs: many(reRestr),
}));

export const reInfRelations = relations(reInf, ({one}) => ({
	rEle: one(rEle, {
		fields: [reInf.rEleId],
		references: [rEle.id]
	}),
}));

export const rePriRelations = relations(rePri, ({one}) => ({
	rEle: one(rEle, {
		fields: [rePri.rEleId],
		references: [rEle.id]
	}),
}));

export const reRestrRelations = relations(reRestr, ({one}) => ({
	rEle: one(rEle, {
		fields: [reRestr.rEleId],
		references: [rEle.id]
	}),
}));

export const sInfRelations = relations(sInf, ({one}) => ({
	sense: one(sense, {
		fields: [sInf.senseId],
		references: [sense.id]
	}),
}));

export const stagkRelations = relations(stagk, ({one}) => ({
	sense: one(sense, {
		fields: [stagk.senseId],
		references: [sense.id]
	}),
}));

export const stagrRelations = relations(stagr, ({one}) => ({
	sense: one(sense, {
		fields: [stagr.senseId],
		references: [sense.id]
	}),
}));

export const xrefRelations = relations(xref, ({one}) => ({
	sense: one(sense, {
		fields: [xref.senseId],
		references: [sense.id]
	}),
}));

export const rawWordCrawlJsonRelations = relations(rawWordCrawlJson, ({one}) => ({
	entry: one(entry, {
		fields: [rawWordCrawlJson.entryId],
		references: [entry.id]
	}),
}));