import Database from 'better-sqlite3'
import { UUID } from 'crypto'
import { cleanFileName } from '../util/cleanFilename.js'

const db = new Database('db/lookup.db')
db.pragma('journal_mode = WAL')

export function initDB() {
  // lookup table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lookup (
      stashid UUID PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE,
      filename TEXT NOT NULL
    );
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_name ON lookup (name COLLATE NOCASE);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_stashid ON lookup (stashid COLLATE NOCASE);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_filename ON lookup (filename COLLATE NOCASE);`)
  // alias reverse lookup
  db.exec(`
    CREATE TABLE IF NOT EXISTS aliases (
      alias TEXT PRIMARY KEY COLLATE NOCASE,
      stashid UUID NOT NULL,
      FOREIGN KEY (stashid) REFERENCES lookup(stashid) ON DELETE CASCADE
    );
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_alias ON aliases (alias COLLATE NOCASE);`)
}

export async function refresh() {
  db.exec('VACUUM;')
  db.exec('ANALYZE;')
  db.exec('PRAGMA optimize;')
}

export const lookupDB = db

// END definitions

export type LookupEntry = {
  stashid: UUID,
  name: string,
  filename: string,
}

export type AliasEntry = {
  alias: string,
  stashid: UUID
}

export function lookup(name: string): string | null {
  const basicLookup = db.prepare('SELECT stashid FROM lookup WHERE name = ? OR filename = ?').get(name, name) as LookupEntry | undefined
  if (basicLookup) return basicLookup.stashid
  const aliasLookup = db.prepare('SELECT stashid FROM aliases WHERE alias = ?').get(name) as AliasEntry | undefined
  if (aliasLookup) return aliasLookup.stashid
  return null
}

export function deleteTag(stashid: UUID): void {
  const deleteAliasStmt = db.prepare('DELETE FROM aliases WHERE stashid = ?')
  const deleteTagStmt = db.prepare('DELETE FROM lookup WHERE stashid = ?')
  const transaction = db.transaction((id: UUID) => {
    deleteAliasStmt.run(id)
    deleteTagStmt.run(id)
  })
  transaction(stashid)
}

export function upsertTag(stashid: UUID, name: string, aliases: string[]): void {
  const filename = cleanFileName(name)
  db.prepare('INSERT INTO lookup (stashid, name, filename) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').run(stashid, name, filename)
  const alias_insert = db.prepare('INSERT INTO aliases (alias, stashid) VALUES (?, ?) ON CONFLICT DO NOTHING')
  const addAlises = db.transaction((txn_aliases: string[]) => {
    for (const alias of txn_aliases) alias_insert.run(alias, stashid)
  })
  addAlises(aliases)
}

export function getAliases(stashid: UUID): string[] {
  const rows: AliasEntry[] = db.prepare('SELECT alias FROM aliases WHERE stashid = ?').all(stashid) as AliasEntry[]
  return rows.map(row => row.alias)
}