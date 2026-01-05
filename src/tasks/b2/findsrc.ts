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
  localDB.prepare('UPDATE localfiles SET src = 1 WHERE path = ?').run(path)
}

type partialB2File = {
  action: string,
  fileName: string,
  contentSha1: string,
}

function getLocalFileName (sourceFile: string): string {
  const replacements: [RegExp, string][] = [
    [/\.\w+\.txt$/, ".webp"], // .*.txt for images
    [/\.txt$/, ".webm"], // txt for videos
    [/\.prproj$/, ".webm"], // proproj for videos
    [/\.\w+$/, ".webp"], // other extensions for images,
  ]
  for (const [pattern, replacement] of replacements) {
    if (sourceFile.match(pattern)) {
      return sourceFile.replace(pattern, replacement)
    }
  }
  return sourceFile // return original if no patterns matched
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
    const localFileName = getLocalFileName(filename)
    const localFile = getLocalFileByPath(localFileName)
    if (localFile) {
      // log(`Found source file: ${b2File.fileName}`)
      localFileAddSource(localFile.path)
    } else {
      error(`Orphaned source: ${b2File.fileName}`)
    }
  }
}

console.log(import.meta)

if (import.meta.main) {
  getSourceFiles()
}