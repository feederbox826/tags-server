import Database from 'better-sqlite3'
import { MiniHash } from '../util/miniHash.js'

const db = new Database('db/stashapp.db')
db.pragma('journal_mode = WAL')

export type stashAppDbTag = {
  name: string,
  id: number,
  ignore: boolean,
  path?: string | null,
  md5?: MiniHash<"md5"> | null
}

export function initDB() {
  // lookup table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      name TEXT,
      id INTEGER PRIMARY KEY,
      ignore BOOLEAN NOT NULL DEFAULT 0,
      path TEXT,
      md5 TEXT
    );
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_name ON tags (name);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_id ON tags (id);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_path ON tags (path);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_md5 ON tags (md5);`)
}

export function refresh() {
  db.exec('VACUUM;')
  db.exec('ANALYZE;')
  db.exec('PRAGMA optimize;')
}

export const stashAppDB = db

// END declarations

export function upsertTag(name: string, id: string, ignore: boolean, path?: string | null, md5?: string | MiniHash<'md5'> | null): void {
  db.prepare(`INSERT INTO tags (name, id, ignore, path, md5) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
    name=excluded.name, ignore=excluded.ignore, path=excluded.path, md5=excluded.md5`)
    .run(name, Number(id), ignore ? 1 : 0, path || null, md5 || null)
}
export function getAllTags(): stashAppDbTag[] {
  const rows = db.prepare(`SELECT * FROM tags`).all()
  return rows as stashAppDbTag[]
}