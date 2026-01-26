// get b2 instance
import debug from 'debug'
const log = debug('tags:tasks:b2:refreshsrc')
debug.enable('tags:*')

import { authorize, listAllFiles } from '../../api/b2.js'
import { toMiniHash } from '../../util/miniHash.js'
import { localDB, srcEntry } from '../../storage/local-db.js'

type partialB2File = {
  action: string,
  fileName: string,
  contentSha1: string,
  contentMd5?: string
}

// auth to b2
export async function refreshSrc() {
  await authorize()
  const localSourceFiles = localDB.prepare('SELECT * FROM b2_src').all() as srcEntry[]
  const b2SourceFiles = await listAllFiles()
  const insertStmt = localDB.prepare('INSERT OR REPLACE INTO b2_src (filename, sha1, md5) VALUES (?, ?, ?)')
  const transaction = localDB.transaction((files: partialB2File[]) => {
    for (const file of files) {
      // skip
      if (file.action === 'folder' || file.fileName.endsWith("/")) continue
      const miniMD5 = file.contentMd5 ? toMiniHash(file.contentMd5) : null
      const miniSHA1 = file.contentSha1 ? toMiniHash(file.contentSha1) : null
      insertStmt.run(file.fileName, miniSHA1, miniMD5)
    }
  })
  transaction(b2SourceFiles.map(f => ({
    action: f.action,
    fileName: f.fileName,
    contentSha1: f.contentSha1,
    contentMd5: f.contentMd5
  })))
  // remove stale entries
  const b2FileMap = new Set(b2SourceFiles.map(f => f.fileName))
  for (const localFile of localSourceFiles) {
    if (!b2FileMap.has(localFile.filename)) {
      log(`Removing stale src entry: ${localFile.filename}`)
      localDB.prepare('DELETE FROM b2_src WHERE filename = ?').run(localFile.filename)
    }
  }
}

if (import.meta.main) {
  refreshSrc()
}