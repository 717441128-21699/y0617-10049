import initSqlJs, { type Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.join(__dirname, 'data')
const DB_PATH = path.join(DB_DIR, 'whiteboard.db')

let db: Database | null = null
let saveInterval: ReturnType<typeof setInterval> | null = null

export async function initDB(): Promise<Database> {
  const SQL = await initSqlJs()

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_room_id ON snapshots(room_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at)`)

  saveInterval = setInterval(saveDB, 30_000)

  return db
}

export function getDB(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.')
  }
  return db
}

export function saveDB(): void {
  if (!db) return
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  } catch (err) {
    console.error('Failed to save database:', err)
  }
}

export function stopDBSave(): void {
  if (saveInterval) {
    clearInterval(saveInterval)
    saveInterval = null
  }
  saveDB()
}
