import Database from 'better-sqlite3'
import { PathLike } from 'fs'
import { MiniHash } from '../util/miniHash.js'

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
      optimized BOOLEAN NOT NULL DEFAULT 0,
      source BOOLEAN NOT NULL DEFAULT 0,
      alt BOOLEAN NOT NULL DEFAULT 0,
      video BOOLEAN NOT NULL DEFAULT 0,
      imge BOOLEAN NOT NULL DEFAULT 0
    )`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_name ON localfiles (name);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sha1 ON localfiles (sha1);`)
}

export async function refresh() {
  db.exec('VACUUM;')
  db.exec('ANALYZE;')
  db.exec('PRAGMA optimize;')
}

export const lookupDB = db

// END definitions

export type LocalFileEntry = {
  path: PathLike,
  filename: string,
  name: string,
  sha1: MiniHash<'sha1'>,
  md5: MiniHash<'md5'>,
  size: number,
  last_modified: number,
  optimized?: boolean,
  source?: boolean,
  alt: boolean,
  video: boolean,
  img: boolean,
  svg: boolean
  height?: number,
}

export const localDB = db