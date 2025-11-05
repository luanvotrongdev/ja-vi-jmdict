import { createRequire } from 'module'
import { searchMaziiKanji, searchMaziiWord } from 'api'
const require = createRequire(import.meta.url)
type JishoAPICtor = new () => import('unofficial-jisho-api').default
// Fall back to the CommonJS build; the ESM bundle expects cheerio to expose a default export.
const JishoAPI = require('unofficial-jisho-api') as unknown as JishoAPICtor

const jisho = new JishoAPI()

async function crawl(word: string)
{
    const maziiWord = await searchMaziiWord(word)
    const maziiKanji = await searchMaziiKanji(word)
    const wordResult = await jisho.searchForPhrase(word)
    const kanjiResult = await jisho.searchForKanji(word)

    const result = {
        maziiWord,
        maziiKanji,
        wordResult,
        kanjiResult
    }

    console.log(`JISHO KANJI: ${JSON.stringify(result, null, 2)}`)
}

crawl("家族")
