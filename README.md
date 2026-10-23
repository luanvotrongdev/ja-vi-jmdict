# ja-vi-jmdict

A Japanese → Vietnamese / English dictionary builder for **Kobo e-readers** and the **Yomitan** browser extension.

> **This is a fun side project.** I built it for myself, in my free time, to read Japanese books on my Kobo with Vietnamese definitions. It is not maintained or supported, so use it at your own risk.

## What it does

Most Japanese dictionaries for e-readers are Japanese–English or Japanese–Japanese. I wanted Vietnamese meanings when I tap a word in a Japanese book, so this project builds a dictionary by combining three sources:

| Source | What it gives |
| --- | --- |
| [JMdict](https://www.edrdg.org/jmdict/edict.html) | The word list: every headword, its kanji spellings and kana readings |
| [Mazii](https://mazii.net) | Vietnamese meanings, word types, example sentences, pitch accent, kanji details (Hán Việt, explanations, components, tips) |
| [Jisho](https://jisho.org) | English meanings, parts of speech, JLPT level, common-word flag, kanji radicals and readings |

The pipeline:

```
JMdict XML ──► SQLite (headwords + readings)
                    │
                    ▼
           crawl Mazii + Jisho for every word and kanji
                    │
                    ▼
           SQLite (raw crawl JSON)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  Yomitan dictionary      Kobo dictionary
  output/lulujv.zip       output/dicthtml-ja.zip
```

### What an entry looks like (Kobo)

```
食べる 【たべる】 [2]  N5 · thông dụng
Cách viết khác: 喰べる
Động từ nhóm 2 · tha động từ
 1. ăn.
    食べるほど食欲がでる。
    Tôi càng ăn nhiều thì sự thèm ăn của tôi càng lớn.
English
 1. Ichidan verb, Transitive verb
    to eat
 2. to live on (e.g. a salary); to live off; to subsist on
```

Looking up a single kanji also shows its kanji card:

```
食  THỰC, TỰ   N5 · 9 nét
Đồ để ăn. Các loài thóc gạo để ăn cho sống người gọi là thực. …
English: eat, food
Âm On: ショク、ジキ
Âm Kun: く.う、く.らう、た.べる、は.む
Bộ: 食 (飠) eat, food
Thành phần: 良 LƯƠNG
Mẹo nhớ: Cái làm tôi thấy tốt(良) ở nhà là ăn
Ví dụ:
食う (くう) THỰC: ăn; hốc; tọng; đớp; sực; nốc
```

You can look a word up by its kanji spelling, its hiragana or katakana reading, or any alternative spelling.

## The database is not included

**This repository does not ship the crawled data.** The Vietnamese and English content comes from Mazii and Jisho, and I do not own their data, so I can't redistribute it. You have to build your own database by running the crawler yourself (see [Usage](#usage)).

JMdict itself is free to use under the [EDRDG licence](https://www.edrdg.org/edrdg/licence.html). The tool downloads it for you.

If you crawl, please be gentle with Mazii and Jisho. The crawler already waits a random 0.4–1.5 seconds between requests; please don't lower that.

## Requirements

- [Bun](https://bun.sh) 1.2.10 or newer (the scripts use Bun's built-in SQLite)
- For the Kobo dictionary: **dictgen** from [pgaskin/dictutil](https://github.com/pgaskin/dictutil/releases) (download the build for your OS)
- For the Kobo: firmware **4.24.15672 or newer**, so custom dictionaries work without patches
- A few GB of free disk space for the database
- Patience: crawling ~190,000 words and their kanji takes **several days**

## Setup

```bash
git clone https://github.com/luanvotrongdev/ja-vi-jmdict.git
cd ja-vi-jmdict
bun install
```

Settings live in `.env`. The defaults work as they are:

| Variable | Default | Meaning |
| --- | --- | --- |
| `JMDICT_FILE_LINK` | `http://ftp.edrdg.org/pub/Nihongo/JMdict_e_examp.gz` | Where JMdict is downloaded from |
| `JMDICT_GZ_NAME` | `JMdict_e_examp.gz` | File name of the download, saved in `sources/` |
| `JMDICT_FILE_NAME` | `sources/JMdict_e_examp.xml` | The extracted XML that gets imported |
| `DB_PATH` | `./dbs/jmdict-cache.sqlite` | The SQLite database |
| `DB_FILE` | `file:./dbs/jmdict-cache.sqlite` | The same database, in the URL form drizzle-kit expects |
| `MIN_CRAWL_SLEEP` / `MAX_CRAWL_SLEEP` | `400` / `1500` | Random wait between crawl requests, in ms |
| `MIN_RETRY_SLEEP` / `MAX_RETRY_SLEEP` | `1800000` / `5400000` | Random wait after a crawl error (30–90 minutes), in ms |
| `DICTGEN_PATH` | *(not set)* | Optional path to dictgen. If unset, the tool looks for `dictgen-windows.exe` etc. in the project folder, then `dictgen` on your PATH |

`.dev.env` is the same, but points to a separate test database. Use it with `bun run test_yomitan`.

## Usage

Every command runs through `bun run main <command>`.

### 1. Import JMdict

```bash
bun run main jmdict
```

It asks three questions:

1. **Redownload JMdict?** Answer `y` the first time. It downloads JMdict into `sources/` and extracts the XML.
2. **Sync database schema?** Answer `y` the first time. **This deletes the existing database** and creates empty tables.
3. **Regenerate JMdict data?** Answer `y` to import every JMdict headword and reading.

### 2. Crawl Mazii and Jisho

```bash
bun run main crawl
```

For each JMdict entry, it searches Mazii and Jisho for the word, then for each kanji in it, and stores the raw results in the database. Each kanji is only crawled once.

- It shows two progress bars: entries done, and phrases in the current batch.
- **You can stop it with Ctrl+C at any time.** Running it again resumes where it left off.
- If a request fails (rate limit, network), it waits 30–90 minutes and tries again.
- When everything is crawled it prints `CRAWL DONE!`. Stop it with Ctrl+C.

To throw away the crawl results and start over, while keeping the JMdict import:

```bash
bun run main resetcrawl
```

### 3a. Build the Kobo dictionary

```bash
bun run main dictfile
```

```bash
bun run main kobo
```

- `dictfile` writes every entry to `output/japanese-english.df`, a text format used by dictgen.
- `kobo` runs dictgen on it, then rearranges the result for Kobo's Japanese lookup. The output is **`output/dicthtml-ja.zip`**.

**Install it on the Kobo:**

1. Connect the Kobo to your computer.
2. Copy `output/dicthtml-ja.zip` into `KOBOeReader/.kobo/custom-dict/` (create the folder if it doesn't exist; `.kobo` is a hidden folder).
3. Eject the Kobo.
4. In a book, long-press a word. In the dictionary popup, pick **日本語 (Custom)** from the dropdown.

### 3b. Build the Yomitan dictionary

```bash
bun run main yomitan
```

This writes **`output/lulujv.zip`**. In Yomitan, open *Settings → Dictionaries → Import* and select the ZIP.

> The Yomitan export still uses the older, simpler entry format. It does not have the new Kobo layout yet.

### All commands

| Command | What it does |
| --- | --- |
| `jmdict` | Download and import JMdict (interactive) |
| `parse` | Import JMdict XML into the database, no questions asked |
| `crawl` | Crawl Mazii and Jisho; resumable |
| `resetcrawl` | Delete all crawl results |
| `resetall` | Delete the database and recreate empty tables |
| `dictfile` | Write `output/japanese-english.df` |
| `kobo` | Build `output/dicthtml-ja.zip` from the dictfile (needs dictgen) |
| `yomitan` | Build `output/lulujv.zip` |

## Kobo notes

Two things took a while to figure out, in case you build your own Japanese dictionary for Kobo:

- **Japanese lookups use their own file layout.** A Kobo dictionary splits its entries into many small files, named after the first letters of each word. For Japanese, Kobo looks up words starting with a kanji in a file named after the **first character only** (`食.html`), and looks up hiragana words in **katakana**. dictgen uses the rules for other languages (`食べ.html`), so its output loads fine but every lookup says "no definition found". `src/kobo.ts` fixes this. The rules come from [kobo_jp_dict](https://github.com/cessen/kobo_jp_dict).
- **Vietnamese letters need a different font.** Kobo shows dictionary text in its built-in Georgia, which is missing most Vietnamese letters (ư, ơ, ạ, ả, ấ, ự, …), so they simply disappear. Every entry now asks for **Kobo Nickel**, which has them. The text is also normalized to NFC, so each accented letter is one character instead of a letter plus separate accent marks. This finding comes from [lelinhtinh/kobo-tieng-viet](https://github.com/lelinhtinh/kobo-tieng-viet), which notes that Vietnamese books display correctly in Kobo Nickel.

### If Vietnamese letters are still missing

The Kobo Nickel font fixes the dictionary on my Kobo. If your Kobo still drops Vietnamese letters, for example on other firmware, use the **Vietnamese font fix by [lelinhtinh/kobo-tieng-viet](https://github.com/lelinhtinh/kobo-tieng-viet)** (*Hướng dẫn sửa lỗi font Tiếng Việt cho máy đọc sách Kobo*, a guide to fixing Vietnamese fonts on Kobo).

It replaces the Kobo's built-in **Georgia** and **Avenir Next** with Vietnamese-capable fonts under the same names. That fixes Vietnamese everywhere: the dictionary popup, book titles, the table of contents and the menus. In short:

1. Download `KoboRoot.tgz` from the [project's latest release](https://github.com/lelinhtinh/kobo-tieng-viet/releases).
2. Copy it into the hidden `KOBOeReader/.kobo/` folder.
3. Eject the Kobo; it installs the fonts and restarts.

Follow the project's own README for the exact, current steps. It also offers Vietnamese ↔ English Kobo dictionaries.

> This changes system files on the Kobo, and a firmware update can undo it, so you may need to reinstall it after updating. It's a third-party project; check it yourself before installing.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/main.ts` | Command-line entry point |
| `src/downloader.ts` | Downloads and extracts JMdict |
| `src/jmdict_process.ts` | Imports JMdict XML into SQLite |
| `src/crawl.ts`, `src/api.ts` | Crawls Jisho and Mazii |
| `src/entries.ts` | Turns raw crawl data into clean word and kanji entries |
| `src/dictfile.ts` | Writes the dictgen dictfile (HTML entries) |
| `src/kobo.ts` | Runs dictgen and rearranges its output for Kobo's Japanese lookup |
| `src/yomitan.ts` | Builds the Yomitan dictionary |
| `src/handler.ts` | Database connection and reset helpers |
| `schemas/` | Database schema (Drizzle) and Mazii API types |

## Credits

- Written by **Vo Trong Luan**, as a personal side project.
- The **Kobo Japanese sharding fix** (`src/kobo.ts`) and the **Vietnamese accent and font handling** were written with the help of [Claude Code](https://claude.com/claude-code), Anthropic's AI coding assistant.
- [JMdict](https://www.edrdg.org/jmdict/edict.html) by the Electronic Dictionary Research and Development Group.
- [Mazii](https://mazii.net) and [Jisho](https://jisho.org), whose data this tool crawls. Neither is affiliated with this project.
- [pgaskin/dictutil](https://github.com/pgaskin/dictutil) for dictgen and its documentation of the Kobo dictionary format.
- [cessen/kobo_jp_dict](https://github.com/cessen/kobo_jp_dict) for showing how Kobo looks up Japanese words.
- [lelinhtinh/kobo-tieng-viet](https://github.com/lelinhtinh/kobo-tieng-viet) for the Vietnamese font findings and the system-wide Kobo Vietnamese font fix.
- [yomichan-dict-builder](https://www.npmjs.com/package/yomichan-dict-builder) and [unofficial-jisho-api](https://www.npmjs.com/package/unofficial-jisho-api).

## License

The code is under the [MIT License](LICENSE). The license covers the code only, not dictionary data. JMdict is under the [EDRDG licence](https://www.edrdg.org/edrdg/licence.html), and the content from Mazii and Jisho belongs to them.
