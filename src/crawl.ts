import { searchKanji } from "api";

async function crawl()
{
    var result = await searchKanji({
        dict: "javi",
        type: "kanji",
        query: "家族",
        page: 1
    })

    console.log(JSON.stringify(result, null, 2));
}

crawl();