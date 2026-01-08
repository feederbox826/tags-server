import Database from 'better-sqlite3'
import { PathLike } from 'fs'

const db = new Database('db/localfiles.db')
db.pragma('journal_mode = WAL')

export function inittDB() {
  // local file table
  db.exec(`
    CREATE TABLE IF NOT EXISTS localfiles (
      path TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      name TEXT NOT NULL,
      sha1 TEXT NOT NULL,
      md5 TEXT NOT NULL,
      size INTEGER NOT NULL,
      last_modified INTEGER NOT NULL,
      src BOOLEAN NOT NULL DEFAULT 0,
      alt BOOLEAN NOT NULL DEFAULT 0,
      vid BOOLEAN NOT NULL DEFAULT 0,
      img BOOLEAN NOT NULL DEFAULT 0,
      svg BOOLEAN NOT NULL DEFAULT 0,
      height INTEGER DEFAULT 0,
      duration INTEGER DEFAULT NULL
    )`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_name ON localfiles (name);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sha1 ON localfiles (sha1);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_md5 ON localfiles (md5);`)
}

export async function refresh() {
  db.exec('VACUUM;')
  db.exec('ANALYZE;')
  db.exec('PRAGMA optimize;')
}
// END definitions

export type LocalFileEntry = {
  path: PathLike,
  filename: string,
  name: string,
  sha1: string,
  md5: string,
  size: number,
  last_modified: number,
  src?: boolean,
  alt: boolean,
  vid: boolean,
  img: boolean,
  svg: boolean
  height?: number,
  duration?: number,
}

export const localDB = db