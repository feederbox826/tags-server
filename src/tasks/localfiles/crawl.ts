const FILE_PATH = "tags"

import debug from 'debug'
const log = debug('tags:tasks:localfiles:crawl')
debug.enable('tags:*')

import * as fsWalk from '@nodelib/fs.walk'
import { imageSizeFromFile } from 'image-size/fromFile'
import path from 'path'

import { localDB, inittDB, LocalFileEntry } from '../../storage/local-db.js'
import { multiHash } from '../../util/multihash.js'

const cleanFileName = (name: string) => name.replace(/( \(\d\))?\.\w+/, '')

function addLocalFiles(files: LocalFileEntry[]): void {
  const insert = localDB.prepare(`
    INSERT OR REPLACE INTO localfiles (path, name, filename, sha1, md5, size, last_modified, alt, video, imge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMany = localDB.transaction((files: LocalFileEntry[]) => {
    for (const file of files) {
      insert.run(
        file.path.toString().replace(/\\/g, '/'), // normalize to forward slashes
        file.name,
        file.filename,
        file.sha1,
        file.md5,
        file.size,
        file.last_modified,
        file.alt ? 1 : 0,
        file.video ? 1 : 0,
        file.img ? 1 : 0
      )
    }
  })
  insertMany(files)
}

export async function crawl(directory: string): Promise<void> {
  inittDB()
  const files = fsWalk.walkSync(directory, { basePath: "", stats: true, followSymbolicLinks: true })
  const fileEntries = [] as LocalFileEntry[]
  for (const file of files) {
    if (!file.stats) continue
    if (file.dirent.isFile()) {
      const realPath = path.join(directory, file.path)
      const basePath = file.path
      const last_modified = file.stats.mtimeMs
      // get hashes
      const [md5, sha1] = await multiHash(realPath)
        .then(hashes => [hashes['md5'], hashes['sha1']])
      const fileEntry: LocalFileEntry = {
        path: file.path.toString().replace(/\\/g, '/'), // normalize to forward slashes
        filename: file.name,
        name: cleanFileName(file.name),
        sha1,
        md5,
        size: file.stats.size,
        last_modified: (last_modified / 1000), // seconds
        alt: basePath.includes('\\alt\\') || basePath.includes('/alt/'),
        video: basePath.endsWith('.webm'),
        img: basePath.endsWith('.webp'),
        svg: basePath.endsWith('.svg'),
      }
      // if image, get dimensions
      if (fileEntry.img) {
        const dimensions = await imageSizeFromFile(realPath)
        if (dimensions && dimensions.height) {
          fileEntry.height = dimensions.height
        }
      }
      // push
      fileEntries.push(fileEntry)
      log(`Crawled: ${realPath}`)
    }
  }
  // add to database
  addLocalFiles(fileEntries)
}
crawl(FILE_PATH)