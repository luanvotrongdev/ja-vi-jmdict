import 'dotenv/config'
import { cwd, env, exit } from 'node:process'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { writeJmdictToDatabase } from './jmdict_process.ts'

type YesNoDefault = true | false

async function promptYesNo(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultValue: YesNoDefault,
): Promise<boolean> {
  const suffix = defaultValue ? ' (Y/n) ' : ' (y/N) '
  const answer = (await rl.question(`${question}${suffix}`)).trim().toLowerCase()
  if (answer.length === 0) {
    return defaultValue
  }
  return answer === 'y' || answer === 'yes'
}

async function runCommand(command: string, args: string[], extraEnv: Record<string, string> = {}) {
  const proc = Bun.spawn({
    cmd: [command, ...args],
    cwd: cwd(),
    env: {
      ...env,
      ...extraEnv,
    },
    stdio: ['inherit', 'inherit', 'inherit'],
  })

  const status = await proc.exited
  if (status !== 0) {
    throw new Error(`Command "${[command, ...args].join(' ')}" failed with exit code ${status}`)
  }
}

async function ensureDownloader(): Promise<void> {
  await runCommand(process.argv[0], ['run', 'src/downloader.ts'])
}

async function pushSchema(dbFileName: string | undefined): Promise<void> {
  const drizzleEnv: Record<string, string> = {}
  if (dbFileName) {
    drizzleEnv.DB_FILE_NAME = dbFileName
  }
  await runCommand('npx', ['drizzle-kit', 'push'], drizzleEnv)
}

async function main() {
  const rl = createInterface({ input, output })

  try {
    const shouldDownload = await promptYesNo(
      rl,
      'Redownload JMdict source archive and extract XML?',
      false,
    )

    if (shouldDownload) {
      console.log('\nDownloading JMdict data...')
      await ensureDownloader()
      console.log('Download complete.\n')
    }

    const dbFileName = env.DB_FILE_NAME
    const dbPath = dbFileName
      ? path.isAbsolute(dbFileName)
        ? dbFileName
        : path.resolve(cwd(), dbFileName)
      : undefined

    const shouldPush = await promptYesNo(
      rl,
      'Sync database schema with drizzle-kit?',
      true,
    )

    if (shouldPush) {
      console.log('\nPushing schema with drizzle-kit...')
      await pushSchema(dbFileName)
      console.log('Schema sync complete.\n')
    }

    const shouldRegenerate = await promptYesNo(
      rl,
      `Regenerate JMdict data in ${dbPath ?? 'configured database'}?`,
      true,
    )

    if (shouldRegenerate) {
      console.log('\nImporting JMdict entries into database...')
      await writeJmdictToDatabase()
      console.log('Database regeneration complete.\n')
    }

    if (!shouldDownload && !shouldPush && !shouldRegenerate) {
      console.log('No actions were selected. Nothing to do.')
    } else {
      console.log('All requested tasks finished successfully.')
    }
  } catch (error) {
    console.error('Flow failed:', error instanceof Error ? error.message : error)
    exit(1)
  } finally {
    rl.close()
  }
}

await main()
