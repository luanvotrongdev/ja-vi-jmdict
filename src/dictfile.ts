import 'dotenv/config'
import { createWriteStream, WriteStream } from "node:fs";
import * as schema from '../schemas'
import { gt, sql } from 'drizzle-orm';
import { getDatabase } from 'handler';
import type { JishoAPIResult, JishoWordSense, KanjiParseResult } from 'unofficial-jisho-api';
import type { MaziiKanjiResult, MaziiWordSearchPayload } from '../schemas/api';
import { existsSync, mkdirSync } from 'node:fs';

const {
    rawKanjiCrawlJson,
    rawWordCrawlJson
} = schema

class DefinitionInfos {
    public entry: Set<string> = new Set();
    public kun: string[] = [];
    public on: string[] = [];
    public vn_cn: string[] = [];
    public explanation: string[] = [];
}

function insertMaziiPhrase(infos: DefinitionInfos, maziiPhrase: MaziiWordSearchPayload) {
    if (!maziiPhrase.words) return
    if (maziiPhrase.words.length == 0) return
    const word = maziiPhrase.words[0]
    if (!word) return
    infos.entry.add(maziiPhrase.words[0]!.word)
    maziiPhrase.words[0]!
        .means
        .forEach((mean: any) => {
            infos.explanation.push(mean.mean!)
        });
}

function insertJishoPhrase(infos: DefinitionInfos, jishoPhrase: JishoAPIResult) {
    if (jishoPhrase.meta.status != 200) return
    if (!jishoPhrase.data) return
    if (jishoPhrase.data.length == 0) return
    const word = jishoPhrase.data[0]
    infos.entry.add(word?.slug!)
    if (word?.japanese.length! > 0) {
        const reading = word?.japanese[0]?.reading
        if (reading) {
            infos.explanation.push(reading)
        }
    }
    if (!word) return

    var means: string[] = word.senses
        .flatMap((mean: JishoWordSense) => mean.english_definitions)
        .filter((mean: string) => mean != null && mean != 'undefined')
    infos.explanation.push(...means)
}

function writePhrasesDefinitionInfos(ws: WriteStream, infos: DefinitionInfos, enIndex: number) {
    const setValues = [...infos.entry]
    ws.write(`@ ${setValues[enIndex]}\n`)
    setValues.forEach(en => {
        ws.write(`& ${en}\n`)
    })
    infos.explanation.forEach(explanation => {
        ws.write(`- ${explanation}\n`)
    })
}

function insertPhrase(
    ws: WriteStream,
    entryRow: typeof rawWordCrawlJson.$inferSelect,
) {
    const jsonParsed = JSON.parse(entryRow.json)
    const jishoPhrase: JishoAPIResult = jsonParsed["jisho"]
    const maziiPhrase: MaziiWordSearchPayload = jsonParsed["mazii"]

    const dictInfo = new DefinitionInfos()
    insertMaziiPhrase(dictInfo, maziiPhrase)
    insertJishoPhrase(dictInfo, jishoPhrase)
    const setValues = [...dictInfo.entry]
    for (var i = 0; i < setValues.length; i++) {
        writePhrasesDefinitionInfos(ws, dictInfo, i)
    }
}

function insertMaziiKanji(infos: DefinitionInfos, maziiKanjis: MaziiKanjiResult[],) {
    if (!maziiKanjis) return
    if (maziiKanjis.length == 0) return
    const maziiKanji = maziiKanjis[0]
    if (!maziiKanji) return
    infos.entry.add(maziiKanji.kanji)
    infos.vn_cn.push(`Hán: ${maziiKanji?.mean}`)
}

function insertJishoKanji(infos: DefinitionInfos, jishoKanji: KanjiParseResult) {
    if (!jishoKanji) return
    if (!jishoKanji.found) return
    infos.entry.add(jishoKanji.query)
    infos.kun.push(...jishoKanji.kunyomi)
    infos.on.push(...jishoKanji.onyomi)
    infos.explanation.push(jishoKanji.meaning)
}

function writeDefinitionInfos(ws: WriteStream, infos: DefinitionInfos, enIndex: number) {
    const setValues = [...infos.entry]
    ws.write(`@ ${setValues[enIndex]}\n`)
    setValues.forEach(en => {
        ws.write(`& ${en}\n`)
    })
    ws.write(`- <${infos.vn_cn[enIndex]}>\n`)
    ws.write(`- [${infos.kun.join(", ")}]\n`)
    ws.write(`- (${infos.on.join(", ")})\n`)
}

function insertKanji(
    ws: WriteStream,
    entryRow: typeof rawKanjiCrawlJson.$inferSelect
) {
    const jsonParsed = JSON.parse(entryRow.json)
    const jishoPhrase: KanjiParseResult = jsonParsed["jisho"]
    const maziiPhrase: MaziiKanjiResult[] = jsonParsed["mazii"]

    const dictInfo = new DefinitionInfos()
    insertJishoKanji(dictInfo, jishoPhrase)
    insertMaziiKanji(dictInfo, maziiPhrase)
    const setValues = [...dictInfo.entry]
    for (var i = 0; i < setValues.length; i++) {
        writeDefinitionInfos(ws, dictInfo, i)
    }
}

async function queryPaginatedEntries(ws: WriteStream, chunkLimit: number) {
    var entryInsertedTotal = 0;
    const db = getDatabase()
    const phraseTotal = db
        .select({ value: sql<number>`count(*)` })
        .from(rawWordCrawlJson)
        .get()?.value!;
    const kanjiTotal = db
        .select({ value: sql<number>`count(*)` })
        .from(rawKanjiCrawlJson)
        .get()?.value!;
    const entryTotal = phraseTotal + kanjiTotal

    // INPUT TERM
    let lastEntryId: number | null = -1;
    while (true) {
        const entries = db
            .select()
            .from(rawWordCrawlJson)
            .orderBy(rawWordCrawlJson.id)
            .where(gt(rawWordCrawlJson.id, lastEntryId))
            .limit(chunkLimit)
            .all()

        if (entries.length === 0) break
        lastEntryId = entries[entries.length - 1]!.id
        for (const row of entries) {
            insertPhrase(ws, row);
            entryInsertedTotal += 1
            console.log(`${entryInsertedTotal}/${entryTotal}`,)
        }
    }

    //INPUT KANJI
    lastEntryId = -1;
    while (true) {
        const entries = db
            .select()
            .from(rawKanjiCrawlJson)
            .orderBy(rawKanjiCrawlJson.id)
            .where(gt(rawKanjiCrawlJson.id, lastEntryId))
            .limit(chunkLimit)
            .all()

        if (entries.length === 0) break
        lastEntryId = entries[entries.length - 1]!.id
        for (const row of entries) {
            insertKanji(ws, row);
            entryInsertedTotal += 1
            console.log(`${entryInsertedTotal}/${entryTotal}`,)
        }
    }
}

export async function buildDictfile() {
    const outputDir = "./output"
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
    }
    const writeStream = createWriteStream(`${outputDir}/japanese-english.df`, { flags: "a" })
    await queryPaginatedEntries(writeStream, 2000)
}