# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal scratchpad (per README: not maintained) that builds a Japanese→Vietnamese/English dictionary. It imports JMdict headwords into SQLite, crawls Mazii.net (Vietnamese) and Jisho.org (English) for each headword and kanji, then exports the merged data as a Yomitan dictionary ZIP or a `.df` dictfile.

## Commands

Runtime is **Bun** (uses `bun:sqlite`, `Bun.spawn`); there is no build step, linter, or test suite.

```bash
bun install
bun run main <command>          # loads .env
bun run test_yomitan            # same as `main yomitan` but loads .dev.env
bunx drizzle-kit push           # sync schemas/ to the SQLite file at DB_FILE
bunx tsc --noEmit               # type-check (tsconfig has noEmit)
```

`<command>` is dispatched from the `actions` map in `src/main.ts`:

- `jmdict` – interactive: optionally re-download JMdict (`src/downloader.ts`), reset DB + `drizzle-kit push`, then import XML.
- `parse` – import JMdict XML into the DB without prompts.
- `crawl` – crawl Mazii + Jisho for every entry. Runs in an infinite retry loop and resumes from the last crawled `entry_id`; stop with Ctrl+C.
- `resetcrawl` – clear the two crawl tables. `resetall` – delete the DB file and re-push the schema.
- `yomitan` – write `output/lulujv.zip`. `dictfile` – write `output/japanese-english.df`.
- `kobo` – run dictgen (from [pgaskin/dictutil](https://github.com/pgaskin/dictutil); path from `DICTGEN_PATH`, else `./dictgen-windows.exe` etc., else `dictgen` on PATH) on the dictfile, then re-shard into `output/dicthtml-ja.zip`. Run `dictfile` first.

`src/test.ts` is a scratch file for `yomichan-dict-builder`, not a test suite.

## Architecture

Pipeline: JMdict XML → `entry`/`k_ele`/`r_ele` tables → crawl → `raw_word_crawl_json`/`raw_kanji_crawl_json` → exporters.

- **`src/handler.ts`** – single cached Drizzle DB (`getDatabase()`/`closeDatabase()`), resolves the DB path from `DB_PATH`, throws if the `entry` table is missing, and wraps `drizzle-kit push`.
- **`schemas/index.ts`** – Drizzle SQLite schema (also the `drizzle-kit` schema source; `drizzle.config.ts` reads `DB_FILE`). `schemas/api.ts` holds Mazii endpoints, headers and response types.
- **`src/jmdict_process.ts`** – parses `sources/<JMDICT_FILE_NAME>` with `fast-xml-parser` and stores only headword (`keb`) and reading (`reb`) text per entry; glosses come from the crawl, not JMdict.
- **`src/crawl.ts`** + **`src/api.ts`** – for each `k_ele`/`r_ele` text, store one JSON blob `{type, mazii, jisho}` per entry, plus one per kanji character (deduped by `textId`). Requests are throttled by random sleeps from `MIN/MAX_CRAWL_SLEEP` and `MIN/MAX_RETRY_SLEEP` (ms). `unofficial-jisho-api` is loaded with `createRequire` on purpose (its ESM build breaks on cheerio).
- **`src/entries.ts`** – turns a raw crawl row into a structured `WordEntry` / `KanjiEntry`. Keys come from JMdict `k_ele`/`r_ele`, not from the crawl results. Mazii/Jisho results are used only if they match the crawled headword, which is the first kanji form or else the first reading. When several Jisho results share a headword (e.g. 食 "food" vs "eclipse"), it picks the one sharing the most spellings with the entry, and drops Mazii for the non-top ones.
- **`src/dictfile.ts`** – renders entries as raw-HTML dictgen entries (`@`, `::`, `&` variants, `<html>` + one line of HTML), with NFC-normalized text. The wrapper `<div class="word common|word|kanji">` controls merge order in `kobo.ts`. The wrapper's inline `font-family` (Kobo Nickel first) is required: Kobo's default dictionary font, Georgia, lacks Vietnamese letters like ư ơ ạ ự, and on-device testing confirmed Kobo honours the inline font.
- **`src/yomitan.ts`** – builds the Yomitan dictionary from `entries.ts`. Definitions are structured content (styled spans and lists, with `data: {content: …}` hooks for custom CSS). It emits one term per (kanji form × reading) pair sharing the JMdict `ent_seq`, sets inflection rules (v1/v5/vs/vk/vz/adj-i; vs/vk/vz only on terms ending in する/来る/ずる), and adds pitch metadata and ★/JLPT tags. Export only once at the end, because `dictionary.export()` re-compresses the whole ZIP. Pass absolute paths to `setIndex`/`export`: with `./`, the library's `mkdir` throws EEXIST under Bun on Windows.
- **`src/kobo.ts`** – Kobo looks up Japanese dictionaries with different shard rules from the ones dictgen implements: words starting with a kanji live in a 1-character shard (`阿.html`), kana words get 2-character shards with no `a` padding, and all-hiragana words also need a katakana key. dictgen's ZIP would load on the device but every lookup failed with "no definition found". `kobo.ts` keeps dictgen's `words` trie and rewrites the HTML shards, following [cessen/kobo_jp_dict](https://github.com/cessen/kobo_jp_dict). Because the trie comes from dictgen, every lookup key, including the katakana and reading variants, must be written as an `&` variant in the dictfile.

## Conventions and gotchas

- Imports inside `src/` use bare module names (`from 'handler'`, `from 'crawl'`) resolved through `baseUrl: ./src` in `tsconfig.json`; schemas are imported relatively (`'../schemas'`).
- Config comes only from env vars in `.env` / `.dev.env` (both committed). `.env` currently lacks `MAX_RETRY_SLEEP`, which `crawl.ts` reads.
- Large data files (`dbs/*.sqlite`, `decompiled.df`, `dicthtml-ja.zip`) are committed; `sources/`, `*.xml`, `*.gz` and `output/` are git-ignored. Avoid reading these files in full.
- Yomitan index metadata is set in `buildYomitan()`; the root `index.json` mirrors it.
- `.vscode/launch.json` has Bun debug configs for `crawl`, `yomitan` and `dictfile`.
