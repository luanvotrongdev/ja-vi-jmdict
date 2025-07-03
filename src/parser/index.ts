import 'dotenv/config'

if (!process.env.DB_FILE_NAME) {
    throw new Error("Environment variable DB_FILE_NAME is not defined")
}
