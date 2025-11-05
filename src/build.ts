import 'dotenv/config'
import { Dictionary, DictionaryIndex, KanjiEntry, TermEntry } from "yomichan-dict-builder";
import * as schema from '../schemas'
import { eq, gt, inArray, sql } from 'drizzle-orm';
import type { DetailedDefinition } from 'yomichan-dict-builder/dist/types/yomitan/termbank';
import { getDatabase } from 'handler';

const {
    entry,
    kEle,
    rEle,
    sense,
    gloss,
} = schema

const kanjiPattern = /^[\u4E00-\u9FAF\u3400-\u4DBF]+$/u

type EntryLookups = {
    kanji: Map<number, string[]>;
    readings: Map<number, string[]>;
    definitions: Map<number, DetailedDefinition[]>;
}

function buildLookups(entryIds: number[]): EntryLookups {
    const lookups: EntryLookups = {
        kanji: new Map(),
        readings: new Map(),
        definitions: new Map(),
    }

    if (entryIds.length === 0) {
        return lookups
    }

    const db = getDatabase()
    const kanjiRows = db
        .select()
        .from(kEle)
        .where(inArray(kEle.entryId, entryIds))
        .all()
    kanjiRows.forEach(({ entryId, keb }) => {
        if (!keb) return;
        const list = lookups.kanji.get(entryId) ?? [];
        list.push(keb);
        lookups.kanji.set(entryId, list);
    })

    const readingRows = db
        .select()
        .from(rEle)
        .where(inArray(rEle.entryId, entryIds))
        .all()
    readingRows.forEach(({ entryId, reb }) => {
        if (!reb) return;
        const list = lookups.readings.get(entryId) ?? [];
        list.push(reb);
        lookups.readings.set(entryId, list);
    })

    const meaningRows = db
        .select()
        .from(sense)
        .leftJoin(gloss, eq(sense.id, gloss.senseId))
        .where(inArray(sense.entryId, entryIds))
        .all()

    const meaningTextByEntry = new Map<number, Set<string>>()
    meaningRows.forEach(({ sense: senseRow, gloss: glossRow }) => {
        const entryId = senseRow?.entryId
        if (entryId == null) return
        const text = glossRow?.value?.trim()
        if (!text) return
        const bucket = meaningTextByEntry.get(entryId) ?? new Set<string>()
        bucket.add(text)
        meaningTextByEntry.set(entryId, bucket)
    })

    meaningTextByEntry.forEach((texts, entryId) => {
        const definitions = Array.from(texts).map(
            (text) => ({ type: 'text', text } as DetailedDefinition),
        )
        lookups.definitions.set(entryId, definitions)
    });

    return lookups;
}

async function insertEntry(
    dictionary: Dictionary,
    entryRow: typeof entry.$inferSelect,
    lookups: EntryLookups
) {
    const entryId = entryRow.id
    const kanjiTerms = lookups.kanji.get(entryId) ?? []
    const readingTerms = lookups.readings.get(entryId) ?? []
    const definitionList = lookups.definitions.get(entryId) ?? []

    const uniqueKanji = Array.from(new Set(kanjiTerms))
    const uniqueReadings = Array.from(new Set(readingTerms))
    const writings = uniqueKanji.length > 0 ? uniqueKanji : uniqueReadings

    if (writings.length === 0) return

    if (uniqueReadings.length === 0) {
        for (const writing of writings) {
            await dictionary.addTerm(
                new TermEntry(writing)
                    .addDetailedDefinitions(definitionList)
                    .build())
        }
    } else {
        for (const writing of writings) {
            for (const reading of uniqueReadings) {
                await dictionary.addTerm(
                    new TermEntry(writing)
                        .setReading(reading)
                        .addDetailedDefinitions(definitionList)
                        .build())
            }
        }
    }

    const kanjis = uniqueKanji.filter(k => kanjiPattern.test(k))
    for (var kanji in kanjis) {
        await dictionary.addKanji(
            new KanjiEntry(kanji)
                .addMeanings(definitionList.map(d => d.toString()))
                .build())
    }
}


async function queryPaginatedEntries(dictionary: Dictionary, chunkLimit: number, maxEntries: number = Number.POSITIVE_INFINITY) {
    var entryInsertedTotal = 0;
    const db = getDatabase()
    const entryTotal = db
        .select({ value: sql<number>`count(*)` })
        .from(entry)
        .get()?.value;

    let lastEntryId: number | null = -1;

    while (true) {
        const entries = db
            .select()
            .from(entry)
            .orderBy(entry.id)
            .where(gt(entry.id, lastEntryId))
            .limit(chunkLimit)
            .all()

        if (entries.length === 0) break

        lastEntryId = entries[entries.length - 1]!.id

        const entryIds = entries.map((row) => row.id)
        const lookups = buildLookups(entryIds);

        for (const row of entries) {
            if (entryInsertedTotal >= maxEntries) return
            await insertEntry(dictionary, row, lookups);

            entryInsertedTotal += 1
            console.log(
                `entry ${entryInsertedTotal}/${entryTotal}`,
            )
        }
    }
}

export async function buildYomitan()
{
    const dictionary = new Dictionary({
        fileName: "./output/lulujv.zip"
    })

    const index = new DictionaryIndex()
        .setTitle("Lulu J-V Dictionary")
        .setAuthor("LULU")
        .setRevision("0.2")
        .setDescription("A test dictionary for Yomitan dict")
        .setAttribution('test')
        .build()
    await dictionary.setIndex(index)
    const maxEntries = process.env.MAX_ENTRIES ? Number(process.env.MAX_ENTRIES) : Number.POSITIVE_INFINITY;
    await queryPaginatedEntries(dictionary, 200, maxEntries)
    await dictionary.export()
}
