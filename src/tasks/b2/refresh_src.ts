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
  // flush existing src entries
  for (const file of b2SourceFiles) {
    const b2File: partialB2File = {
      action: file.action,
      fileName: file.fileName,
      contentSha1: file.contentSha1,
      contentMd5: file.contentMd5
    }
    const miniMD5 = b2File.contentMd5 ? toMiniHash(b2File.contentMd5) : null
    const miniSHA1 = b2File.contentSha1 ? toMiniHash(b2File.contentSha1) : null
    // skip if action = folder
    if (b2File.action === 'folder' || file.fileName.endsWith("/")) continue
    // check if source file exists, strip sources prefix
    localDB.prepare('INSERT OR REPLACE INTO b2_src (filename, sha1, md5) VALUES (?, ?, ?)').run(b2File.fileName, miniSHA1, miniMD5)
  }
  // remove stale entries
  for (const localFile of localSourceFiles) {
    const existsInB2 = b2SourceFiles.find(f => f.fileName === localFile.filename)
    if (!existsInB2) {
      log(`Removing stale src entry: ${localFile.filename}`)
      localDB.prepare('DELETE FROM b2_src WHERE filename = ?').run(localFile.filename)
    }
  }
}

if (import.meta.main) {
  refreshSrc()
}
refreshSrc()