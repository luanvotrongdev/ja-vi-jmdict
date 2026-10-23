// Turns dictgen's Kobo dictzip into one that Kobo's Japanese lookup can read.
//
// dictgen shards entries with Kobo's non-Japanese prefix rules ("阿世.html",
// "阿a.html"), but for a Japanese dictionary Kobo looks a kanji word up in a
// 1-character shard ("阿.html"). We keep dictgen's `words` trie and rewrite
// the HTML shards. Rules follow https://github.com/cessen/kobo_jp_dict.
import JSZip from 'jszip'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { runCommand } from 'handler'

const DICTFILE = './output/japanese-english.df'
const DICTGEN_ZIP = './output/dictgen.zip'
const KOBO_ZIP = './output/dicthtml-ja.zip'

const KANA_DIFF = 0x30a1 - 0x3041

function isKana(ch: string): boolean {
  const c = ch.codePointAt(0)!
  return (
    (c >= 0x3041 && c <= 0x3096) || // hiragana
    (c >= 0x3099 && c <= 0x309e) || // combining + iteration marks
    (c >= 0x30a1 && c <= 0x30f6) || // katakana
    (c >= 0x30fc && c <= 0x30fe)    // prolonged sound + iteration marks
  )
}

export function isAllKana(text: string): boolean {
  return text.length > 0 && [...text].every(isKana)
}

export function hiraganaToKatakana(text: string): string {
  return [...text]
    .map(ch => {
      const c = ch.codePointAt(0)!
      return (c >= 0x3041 && c <= 0x3096) || (c >= 0x309d && c <= 0x309e)
        ? String.fromCodePoint(c + KANA_DIFF)
        : ch
    })
    .join('')
}

// Shard prefix Kobo uses for a word in a Japanese dictionary.
export function japanesePrefix(word: string): string {
  const chars = [...word.toLowerCase().trim()].slice(0, 2)
  if (chars.length === 0) return '11'
  const c = chars[0]!.codePointAt(0)!

  // Cyrillic and kana: up to 2 characters, no padding.
  if ((c >= 0x0400 && c <= 0x052f) || (c >= 0x2de0 && c <= 0x2dff) ||
      (c >= 0xa640 && c <= 0xa69f) || (c >= 0x3040 && c <= 0x30ff)) {
    return chars.join('')
  }
  // Kanji: first character only.
  if ((c >= 0x3400 && c <= 0x4dbf) || (c >= 0x4e00 && c <= 0x9fff)) {
    return chars[0]!
  }
  const isLetter = (ch: string) => /\p{L}/u.test(ch)
  if (isLetter(chars[0]!)) {
    if (chars.length === 1) return chars[0] + 'a'
    if (isLetter(chars[1]!)) return chars.join('')
  }
  return '11'
}

const ENTRY_RE = /<w>([\s\S]*?)<\/w>/g
const HEADWORD_RE = /<a name="([^"]*)" \/>/
const VAR_RE = /<var>([\s\S]*?)<\/var>/
const VARIANT_RE = /<variant name="([^"]*)"\/>/g

// Splits a dictgen <w> entry into its lookup keys and the HTML to display.
function parseEntry(inner: string): { keys: string[], body: string } | null {
  const head = HEADWORD_RE.exec(inner)
  if (!head) return null
  const varMatch = VAR_RE.exec(inner)
  const variants = varMatch ? [...varMatch[1]!.matchAll(VARIANT_RE)].map(m => m[1]!) : []
  const body = inner.replace(HEADWORD_RE, '').replace(VAR_RE, '')
  const keys = [...new Set([head[1]!, ...variants].map(k => k.trim()).filter(k => k.length > 0))]
  return { keys, body }
}

export async function reshardForJapanese(inputZip: string, outputZip: string) {
  const source = await JSZip.loadAsync(await Bun.file(inputZip).arrayBuffer())
  const words = source.file('words')
  if (!words) throw new Error(`${inputZip} has no "words" index`)

  // dictgen copies an entry into every shard one of its keys falls in,
  // so skip entries already seen.
  const seen = new Set<string>()
  // prefix -> key -> definition bodies
  const shards = new Map<string, Map<string, string[]>>()

  const htmlFiles = Object.keys(source.files).filter(name => name.endsWith('.html'))
  for (const name of htmlFiles) {
    const html = new TextDecoder().decode(Bun.gunzipSync(await source.file(name)!.async('arraybuffer')))
    for (const match of html.matchAll(ENTRY_RE)) {
      const inner = match[1]!
      if (seen.has(inner)) continue
      seen.add(inner)
      const entry = parseEntry(inner)
      if (!entry) continue
      for (const key of entry.keys) {
        const prefix = japanesePrefix(key)
        let shard = shards.get(prefix)
        if (!shard) shards.set(prefix, shard = new Map())
        const bodies = shard.get(key)
        if (bodies) {
          if (!bodies.includes(entry.body)) bodies.push(entry.body)
        } else {
          shard.set(key, [entry.body])
        }
      }
    }
  }

  const out = new JSZip()
  out.file('words', await words.async('uint8array'))
  for (const [prefix, shard] of shards) {
    // Shorter keys first, so Kobo's fallback prefix match picks the closest word.
    const keys = [...shard.keys()].sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0))
    // Kobo often shows only one of several exact matches, so merge them into one entry.
    const entries = keys.map(key => `<w><p><a name="${key}" />${shard.get(key)!.join('')}</p></w>`)
    const html = `<?xml version="1.0" encoding="utf-8"?><html>${entries.join('')}</html>`
    out.file(`${prefix}.html`, Bun.gzipSync(new TextEncoder().encode(html)))
  }

  const zip = await out.generateAsync({ type: 'uint8array', compression: 'STORE' })
  await Bun.write(outputZip, zip)
  console.log(`Wrote ${outputZip}: ${shards.size} shards (dictgen had ${htmlFiles.length}).`)
}

function findDictgen(): string {
  if (process.env.DICTGEN_PATH) return process.env.DICTGEN_PATH
  for (const candidate of ['./dictgen-windows.exe', './dictgen-windows-64bit.exe', './dictgen-darwin-64bit', './dictgen-linux-64bit']) {
    if (existsSync(candidate)) return candidate
  }
  return 'dictgen'
}

// Runs dictgen on the dictfile, then reshards the result for Kobo's Japanese lookup.
export async function buildKobo() {
  if (!existsSync(DICTFILE)) {
    throw new Error(`${DICTFILE} not found. Run "bun run main dictfile" first.`)
  }
  await runCommand(findDictgen(), ['-o', DICTGEN_ZIP, DICTFILE])
  await reshardForJapanese(DICTGEN_ZIP, KOBO_ZIP)
  await rm(DICTGEN_ZIP)
}
