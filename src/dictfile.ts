import 'dotenv/config'
import { createWriteStream, WriteStream } from "node:fs";
import * as schema from '../schemas'
import { gt, sql } from 'drizzle-orm';
import { getDatabase } from 'handler';
import type { JishoAPIResult, JishoWordSense, KanjiParseResult } from 'unofficial-jisho-api';
import type { MaziiKanjiResult, MaziiWordSearchPayload } from '../schemas/api';
import { existsSync, mkdirSync } from 'node:fs';
import { hiraganaToKatakana, isAllKana } from 'kobo';

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
            // Also a lookup key, so words printed in kana are found.
            infos.entry.add(reading)
        }
    }
    if (!word) return

    var means: string[] = word.senses
        .flatMap((mean: JishoWordSense) => mean.english_definitions)
        .filter((mean: string) => mean != null && mean != 'undefined')
    infos.explanation.push(...means)
}

// Kobo's fonts draw Vietnamese tone marks badly when they are separate
// combining characters (NFD), so compose them (NFC). Also drop invisible
// characters and keep each value on one dictfile line.
function cleanText(text: string): string {
    return text
        .normalize('NFC')
        .replace(/[​﻿­\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
        .replace(/\s*[\r\n\t]+\s*/g, ' ')
        .trim()
}

function writeLine(ws: WriteStream, text: string) {
    ws.write(`${cleanText(text)}\n`)
}

// Writes the headword line and one `&` variant line per other form. All-kana
// forms also get a katakana variant: Kobo looks hiragana words up in katakana.
function writeHeadwords(ws: WriteStream, entries: Set<string>) {
    const [mainEntry, ...others] = [...entries]
    const variants = new Set(others)
    for (const en of entries) {
        if (isAllKana(en)) variants.add(hiraganaToKatakana(en))
    }
    variants.delete(mainEntry!)
    writeLine(ws, `@ ${mainEntry}`)
    variants.forEach(en => {
        writeLine(ws, `& ${en}`)
    })
}

function writePhrasesDefinitionInfos(ws: WriteStream, infos: DefinitionInfos) {
    writeHeadwords(ws, infos.entry)
    infos.explanation.forEach(explanation => {
        writeLine(ws, `- ${explanation}`)
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
    if (dictInfo.entry.size > 0) {
        writePhrasesDefinitionInfos(ws, dictInfo)
    }
}

function insertMaziiKanji(infos: DefinitionInfos, maziiKanjis: MaziiKanjiResult[],) {
    if (!maziiKanjis) return
    if (maziiKanjis.length == 0) return
    const maziiKanji = maziiKanjis[0]
    if (!maziiKanji) return
    infos.entry.add(maziiKanji.kanji)
    infos.vn_cn.push(`${maziiKanji?.mean}`)
}

function insertJishoKanji(infos: DefinitionInfos, jishoKanji: KanjiParseResult) {
    if (!jishoKanji) return
    if (!jishoKanji.found) return
    infos.entry.add(jishoKanji.query)
    infos.kun.push(...jishoKanji.kunyomi)
    infos.on.push(...jishoKanji.onyomi)
    infos.explanation.push(jishoKanji.meaning)
}

function writeDefinitionInfos(ws: WriteStream, infos: DefinitionInfos) {
    writeHeadwords(ws, infos.entry)
    // Full-width brackets: dictgen's Markdown would read "<A, Á>" as an HTML tag and hide it.
    writeLine(ws, `- ＜${infos.vn_cn.join(", ")}＞`)
    writeLine(ws, `- [${infos.kun.join(", ")}]`)
    writeLine(ws, `- (${infos.on.join(", ")})`)
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
    if (dictInfo.entry.size > 0) {
        writeDefinitionInfos(ws, dictInfo)
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
            console.log(`${entryInsertedTotal}/${entryTotal}`)

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
    const writeStream = createWriteStream(`${outputDir}/japanese-english.df`, { flags: "w" })
    await queryPaginatedEntries(writeStream, 2000)
    // Flush before `kobo` reads the file.
    await new Promise<void>((resolve, reject) => writeStream.end((err?: Error | null) => err ? reject(err) : resolve()))
}