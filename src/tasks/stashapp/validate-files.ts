import debug from 'debug'
const log = debug('tags:task:stashapp:import')
debug.enable('tags:*')

import { lookupDB, LocalFileEntry } from '../../storage/local-db.js'
import { stashAppDB, getAllTags, stashAppDbTag } from '../../storage/stashapp-db.js'
import { cleanFileName } from '../../util/cleanFilename.js'

const findLocalFileByMD5 = (md5: string): LocalFileEntry =>
  lookupDB.prepare(`SELECT * FROM localfiles WHERE md5 = ?`).get(md5) as LocalFileEntry

// find files with mismatched md5
export function findDifferingFiles() {
  const stashappTags = getAllTags()
  const differingFiles = [] // type later
  for (const tag of stashappTags) {
    if (!tag.path || !tag.md5) continue
    const localFile = findLocalFileByMD5(tag.md5)
    // console.log(tag, localFile)
    // if file is alt, throw error
    if (!localFile) {
      log(`Tag ${tag.name} (${tag.id}) has no matching local file for md5: ${tag.md5}`)
      differingFiles.push({ tag, localFile })
    } else if (localFile.alt) {
      log(`Tag ${tag.name} (${tag.id}) matches alt file: ${localFile.path}`)
      differingFiles.push({ tag, localFile })
    } else if (localFile.name !== cleanFileName(tag.name)) {
      log(`Tag ${tag.name} (${tag.id}) name mismatch with file: ${localFile.name} (${localFile.path})`)
      differingFiles.push({ tag, localFile })
    }
  }
  log(`Found ${differingFiles.length} differing files`)
}
findDifferingFiles()