import 'dotenv/config'
import path from 'path'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { getJmdict } from './parser.ts'
import * as schema from '../schemas/index.ts'

type RawNode = unknown

const {
  entry,
  kEle,
  keInf,
  kePri,
  rEle,
  reRestr,
  reInf,
  rePri,
  sense,
  stagk,
  stagr,
  pos,
  xref,
  ant,
  field,
  misc,
  senseInfo,
  lsource,
  dial,
  gloss,
  glossPriority,
  example,
  exampleSentence,
} = schema

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

function textOf(value: RawNode): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'object') {
    const withText = value as Record<string, unknown>
    if ('#text' in withText) {
      return textOf(withText['#text'])
    }
    return null
  }
  return null
}

function attrOf(value: RawNode, attribute: string): string | undefined {
  if (value === null || value === undefined) {
    return undefined
  }
  if (typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  const attrValue = record[`@_${attribute}`]
  if (attrValue === null || attrValue === undefined) {
    return undefined
  }
  return String(attrValue)
}

export async function writeJmdictToDatabase(): Promise<void> {
  if (!process.env.DB_PATH) {
    throw new Error('DB_FILE_NAME environment variable is required')
  }

  const jmdict = await getJmdict()
  if (!jmdict?.entry) {
    throw new Error('JMdict payload does not contain any entries')
  }

  const entries = toArray(jmdict.entry as RawNode)
  const dbPath = path.isAbsolute(process.env.DB_PATH)
    ? process.env.DB_FILE_NAME
    : path.resolve(process.cwd(), process.env.DB_PATH)
  console.log("FAFAFFAFAFA", path)
  const sqlite = new Database(dbPath, { create: true })
  sqlite.exec('PRAGMA foreign_keys = ON')

  const hasEntryTable = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get('entry')
  if (!hasEntryTable) {
    sqlite.close()
    throw new Error(
      `SQLite schema is missing expected JMdict tables. Run "npx drizzle-kit push" to create them before importing.`,
    )
  }

  const db = drizzle(sqlite, { schema })

  console.log(`Importing ${entries.length} JMdict entries into ${dbPath}...`)

  try {
    db.transaction((tx) => {
      tx.delete(entry).run()

      entries.forEach((rawEntry) => {
        const entryRecord = rawEntry as Record<string, unknown>
        const entSeqValue = Number(entryRecord.ent_seq)
        if (Number.isNaN(entSeqValue)) {
          return
        }

        const entryRow = tx
          .insert(entry)
          .values({ entSeq: entSeqValue })
          .returning({ id: entry.id })
          .get()
        if (!entryRow) {
          throw new Error('Failed to insert entry row')
        }
        const entryId = entryRow.id

        const kElements = toArray(entryRecord.k_ele as RawNode)
        kElements.forEach((ke, keIndex) => {
          const node = ke as Record<string, unknown>
          const kebValue = textOf(node.keb)
          if (kebValue === null) {
            return
          }

          const kEleRow = tx
            .insert(kEle)
            .values({
              entryId,
              keb: kebValue,
              position: keIndex,
            })
            .returning({ id: kEle.id })
            .get()
          if (!kEleRow) {
            throw new Error('Failed to insert k_ele row')
          }
          const kEleId = kEleRow.id

          toArray(node.ke_inf as RawNode).forEach((info, infoIndex) => {
            const infoValue = textOf(info)
            if (infoValue === null) {
              return
            }
            tx
              .insert(keInf)
              .values({
                kEleId,
                value: infoValue,
                position: infoIndex,
              })
              .run()
          })

          toArray(node.ke_pri as RawNode).forEach((pri, priIndex) => {
            const priValue = textOf(pri)
            if (priValue === null) {
              return
            }
            tx
              .insert(kePri)
              .values({
                kEleId,
                value: priValue,
                position: priIndex,
              })
              .run()
          })
        })

        const readingElements = toArray(entryRecord.r_ele as RawNode)
        readingElements.forEach((re, reIndex) => {
          const node = re as Record<string, unknown>
          const rebValue = textOf(node.reb)
          if (rebValue === null) {
            return
          }

          const rEleRow = tx
            .insert(rEle)
            .values({
              entryId,
              reb: rebValue,
              noKanji: textOf(node.re_nokanji),
              position: reIndex,
            })
            .returning({ id: rEle.id })
            .get()
          if (!rEleRow) {
            throw new Error('Failed to insert r_ele row')
          }
          const rEleId = rEleRow.id

          toArray(node.re_restr as RawNode).forEach((restr, restrIndex) => {
            const restrValue = textOf(restr)
            if (restrValue === null) {
              return
            }
            tx
              .insert(reRestr)
              .values({
                rEleId,
                value: restrValue,
                position: restrIndex,
              })
              .run()
          })

          toArray(node.re_inf as RawNode).forEach((info, infoIndex) => {
            const infoValue = textOf(info)
            if (infoValue === null) {
              return
            }
            tx
              .insert(reInf)
              .values({
                rEleId,
                value: infoValue,
                position: infoIndex,
              })
              .run()
          })

          toArray(node.re_pri as RawNode).forEach((pri, priIndex) => {
            const priValue = textOf(pri)
            if (priValue === null) {
              return
            }
            tx
              .insert(rePri)
              .values({
                rEleId,
                value: priValue,
                position: priIndex,
              })
              .run()
          })
        })

        const senseNodes = toArray(entryRecord.sense as RawNode)
        senseNodes.forEach((senseNode, senseIndex) => {
          const node = senseNode as Record<string, unknown>
          const senseRow = tx
            .insert(sense)
            .values({
              entryId,
              senseIndex,
            })
            .returning({ id: sense.id })
            .get()
          if (!senseRow) {
            throw new Error('Failed to insert sense row')
          }
          const senseId = senseRow.id

          toArray(node.stagk as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            if (text === null) {
              return
            }
            tx
              .insert(stagk)
              .values({
                senseId,
                value: text,
                position: idx,
              })
              .run()
          })

          toArray(node.stagr as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            if (text === null) {
              return
            }
            tx
              .insert(stagr)
              .values({
                senseId,
                value: text,
                position: idx,
              })
              .run()
          })

          toArray(node.pos as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            if (text === null) {
              return
            }
            tx
              .insert(pos)
              .values({
                senseId,
                value: text,
                position: idx,
              })
              .run()
          })

          toArray(node.xref as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            if (text === null) {
              return
            }
            tx
              .insert(xref)
              .values({
                senseId,
                value: text,
                position: idx,
              })
              .run()
          })

          toArray(node.ant as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            if (text === null) {
              return
            }
            tx
              .insert(ant)
              .values({
                senseId,
                value: text,
                position: idx,
              })
              .run()
          })

          toArray(node.field as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            if (text === null) {
              return
            }
            tx
              .insert(field)
              .values({
                senseId,
                value: text,
                position: idx,
              })
              .run()
          })

          toArray(node.misc as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            if (text === null) {
              return
            }
            tx
              .insert(misc)
              .values({
                senseId,
                value: text,
                position: idx,
              })
              .run()
          })

          toArray(node.s_inf as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            if (text === null) {
              return
            }
            tx
              .insert(senseInfo)
              .values({
                senseId,
                value: text,
                position: idx,
              })
              .run()
          })

          toArray(node.lsource as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            tx
              .insert(lsource)
              .values({
                senseId,
                value: text,
                language: attrOf(value, 'xml:lang'),
                sourceType: attrOf(value, 'ls_type'),
                wasei: attrOf(value, 'ls_wasei'),
                position: idx,
              })
              .run()
          })

          toArray(node.dial as RawNode).forEach((value, idx) => {
            const text = textOf(value)
            if (text === null) {
              return
            }
            tx
              .insert(dial)
              .values({
                senseId,
                value: text,
                position: idx,
              })
              .run()
          })

          const glossNodes = toArray(node.gloss as RawNode)
          glossNodes.forEach((value, idx) => {
            const text = textOf(value)
            const glossRow = tx
              .insert(gloss)
              .values({
                senseId,
                value: text,
                language: attrOf(value, 'xml:lang'),
                gender: attrOf(value, 'g_gend'),
                glossType: attrOf(value, 'g_type'),
                position: idx,
              })
              .returning({ id: gloss.id })
              .get()
            if (!glossRow) {
              throw new Error('Failed to insert gloss row')
            }
            const glossId = glossRow.id

            toArray((value as Record<string, unknown>)?.pri as RawNode).forEach((pri, priIndex) => {
              const priValue = textOf(pri)
              if (priValue === null) {
                return
              }
              tx
                .insert(glossPriority)
                .values({
                  glossId,
                  value: priValue,
                  position: priIndex,
                })
                .run()
            })
          })

          const examples = toArray(node.example as RawNode)
          examples.forEach((exampleNode, exampleIndex) => {
            const exampleRecord = exampleNode as Record<string, unknown>
            const exampleRow = tx
              .insert(example)
              .values({
                senseId,
                source: textOf(exampleRecord.ex_srce),
                sourceType: attrOf(exampleRecord.ex_srce, 'exsrc_type'),
                termText: textOf(exampleRecord.ex_text),
                position: exampleIndex,
              })
              .returning({ id: example.id })
              .get()
            if (!exampleRow) {
              throw new Error('Failed to insert example row')
            }
            const exampleId = exampleRow.id

            toArray(exampleRecord.ex_sent as RawNode).forEach((sentenceNode, sentenceIndex) => {
              const sentenceValue = textOf(sentenceNode)
              if (sentenceValue === null) {
                return
              }
              tx
                .insert(exampleSentence)
                .values({
                  exampleId,
                  language: attrOf(sentenceNode, 'xml:lang'),
                  value: sentenceValue,
                  position: sentenceIndex,
                })
                .run()
            })
          })
        })
      })
    })

    console.log('JMdict import complete.')
  } finally {
    sqlite.close()
  }
}

if (import.meta.main) {
  await writeJmdictToDatabase()
}
