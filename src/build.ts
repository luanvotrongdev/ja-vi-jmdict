import { Dictionary, DictionaryIndex } from "yomichan-dict-builder";

export async function buildYomitanDict() {
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
    await dictionary.export()
}

buildYomitanDict()