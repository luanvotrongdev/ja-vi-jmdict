import http, { IncomingMessage } from 'http';
import fs from 'fs'
import { cwd } from 'process'
import zlib from 'zlib'

if (!process.env.JMDICT_FILE_LINK) {
    throw new Error("Environment variable JMDICT_FILE_LINK is not defined")
}
if (!process.env.JMDICT_GZ_NAME) {
    throw new Error("Environment variable JMDICT_GZ_NAME is not defined")
}

const gzUrl = `${cwd()}/sources/${process.env.JMDICT_GZ_NAME}`

if (fs.existsSync(gzUrl))
    fs.rmSync(gzUrl, { recursive: false, force: true });

const file = fs.createWriteStream(gzUrl);

const downloadPromise = new Promise((resolve, reject) => {
    http.get(process.env.JMDICT_FILE_LINK as string, (response: IncomingMessage) => {
        
        const total = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
         response.on('data', (chunk) => {
            downloaded += chunk.length;
            if (total) {
                const percent = ((downloaded / total) * 100).toFixed(2);
                process.stdout.write(`\rDownloading JMDict file... ${percent}%`);
            }
        });

        response.pipe(file);

        file.on("finish", () => {
            file.close();
            console.log("Download Completed");
            resolve(true);
        })
        file.on("error", (err) => {
            console.error("Error writing file:", err);
            reject(err);
        })
    })
})

await downloadPromise;