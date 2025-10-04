import Database from 'better-sqlite3'
import { miniMD5 } from '../util/miniMD5.js'

const db = new Database('stashapp.db')
db.pragma('journal_mode = WAL')

type stashAppDbTag = {
  name: string,
  id: number,
  ignore: boolean,
  path?: string | null,
  md5?: miniMD5 | null
}

export async function initDB() {
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

export async function refresh() {
  db.exec('VACUUM;')
  db.exec('ANALYZE;')
  db.exec('PRAGMA optimize;')
}

export async function closeDB() {
  db.close()
}

// END declarations

export async function upsertTag(name: string, id: string, ignore: boolean, path?: string | null, md5?: string | null): Promise<void> {
  db.prepare(`INSERT INTO tags (name, id, ignore, path, md5) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
    name=excluded.name, ignore=excluded.ignore, path=excluded.path, md5=excluded.md5`)
    .run(name, Number(id), ignore ? 1 : 0, path || null, md5 || null)
}

export async function setMD5(path: string, md5: string): Promise<void> {
  db.prepare(`UPDATE tags SET md5 = ? WHERE path = ?`).run(md5, path)
}

export async function getTagByID(id: number): Promise<stashAppDbTag | null> {
  const row = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id)
  return row ? row as stashAppDbTag : null
}