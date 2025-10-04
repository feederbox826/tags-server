import Database from 'better-sqlite3'
import { UUID } from 'crypto'
import { cleanFileName } from '../util/cleanFilename.js'
import { PathLike } from 'fs'
import { MiniHash } from '../util/miniHash.js'
import { LookupEntry, AliasEntry } from './lookup-db.js'

const db = new Database('db/localfiles.db')
db.pragma('journal_mode = WAL')

export function inittDB() {
  // local file table
  db.exec(`
    CREATE TABLE IF NOT EXISTS localfiles (
      path TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sha1 TEXT NOT NULL,
      md5 TEXT NOT NULL,
      size INTEGER NOT NULL,
      last_modified INTEGER NOT NULL,
      optimized BOOLEAN NOT NULL DEFAULT 0,
      alt BOOLEAN NOT NULL DEFAULT 0,
      video BOOLEAN NOT NULL DEFAULT 0,
      imge BOOLEAN NOT NULL DEFAULT 0
    )`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_name ON localfiles (name);`)
}

export async function refresh() {
  db.exec('VACUUM;')
  db.exec('ANALYZE;')
  db.exec('PRAGMA optimize;')
}

export async function closeDB() {
  db.close()
}

// END definitions

export type LocalFileEntry = {
  path: PathLike,
  filename: string,
  name: string,
  sha1: MiniHash<'sha1'>,
  md5: MiniHash<'md5'>,
  size: number,
  last_modified: number,
  optimized: boolean,
  alt: boolean,
  video: boolean,
  img: boolean,
  svg: boolean
  height?: number,
}

export function addLocalFiles(files: LocalFileEntry[]): void {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO localfiles (path, name, sha1, md5, size, last_modified, optimized, alt, video, imge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMany = db.transaction((files: LocalFileEntry[]) => {
    for (const file of files) {
      insert.run(
        file.path,
        file.name,
        file.sha1.value,
        file.md5.value,
        file.size,
        file.last_modified,
        file.optimized ? 1 : 0,
        file.alt ? 1 : 0,
        file.video ? 1 : 0,
        file.img ? 1 : 0
      )
    }
  })
  insertMany(files)
}
