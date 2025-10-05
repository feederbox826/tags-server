// get b2 instance
import debug from 'debug'
const log = debug('tags:tasks:b2:findsrc')
const error = debug('tags:tasks:b2:findsrc:error')
debug.enable('tags:*')

import b2, { listAllFiles } from '../../api/b2.js'
import { localDB, LocalFileEntry } from '../../storage/local-db.js'
import { PathLike } from 'fs'

function getLocalFileByPath(path: string): LocalFileEntry | null {
  const row = localDB.prepare('SELECT * FROM localfiles WHERE path = ?').get(path) as LocalFileEntry | undefined
  return row || null
}

function localFileAddSource(path: string | PathLike): void {
  localDB.prepare('UPDATE localfiles SET source = 1 WHERE path = ?').run(path)
}

type partialB2File = {
  action: string,
  fileName: string,
  contentSha1: string,
}

// auth to b2
export async function getSourceFiles() {
  await b2.authorize()
  const sourceFiles = await listAllFiles()
  for (const file of sourceFiles) {
    const b2File: partialB2File = {
      action: file.action,
      fileName: file.fileName,
      contentSha1: file.contentSha1,
    }
    // skip if action = folder
    if (b2File.action === 'folder' || file.fileName.endsWith("/")) continue
    // check if source file exists, strip sources prefix
    const filename = b2File.fileName.replace(/^sources\//, '')
    // txt to webm (video)
    // jpeg / * to webp (image)
    const localFileName =  filename.endsWith('.txt')
        ? filename.replace('.txt', '.webm')
        : filename.replace(/\.\w+$/, '.webp')
    const localFile = getLocalFileByPath(localFileName)
    if (localFile) {
      // log(`Found source file: ${b2File.fileName}`)
      localFileAddSource(localFile.path)
    } else {
      error(`Source file missing: ${b2File.fileName}`)
    }
  }
}
getSourceFiles()