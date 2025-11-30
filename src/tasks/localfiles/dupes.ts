import debug from 'debug'
const log = debug('tags:tasks:localfiles:dupes')
debug.enable('tags:*')

import { localDB, LocalFileEntry } from "../../storage/local-db.js"

export function getDupeHashes(): void {
  const dupehashes = localDB.prepare(`
    SELECT sha1, COUNT(*) c
    FROM localfiles
    GROUP BY sha1 HAVING c > 1;
  `).all()
    .map((r: any) => ({ sha1: r.sha1, count: r.c }))
  // log
  log(`Found ${dupehashes.length} duplicate hashes`)
  // get all files with hashes
  for (const hash of dupehashes) {
    const files = localDB.prepare(`
      SELECT *
      FROM localfiles
      WHERE sha1 = ?;
    `).all(hash.sha1) as LocalFileEntry[]
    log(`Hash ${hash.sha1} has ${files.length} files:`)
    for (const file of files) {
      log(` - ${file.path}`)
    }
  }
}
// getDupeHashes()