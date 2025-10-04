const FILE_PATH = "tags"

import debug from 'debug'
const log = debug('tags:tasks:localfiles:crawl')
debug.enable('tags:*')

import * as fsWalk from '@nodelib/fs.walk'
import { imageSizeFromFile } from 'image-size/fromFile'

import { addLocalFiles, inittDB, LocalFileEntry } from '../../storage/local-db.js'
import { multiHash } from '../../util/multihash.js'
import { MiniHash } from '../../util/miniHash.js'

const cleanFileName = (name: string) => name.replace(/ \(\d\)\.\w+/, '')

export async function crawl(directory: string): Promise<void> {
  inittDB()
  const files = fsWalk.walkSync(directory, { basePath: directory, stats: true })
  const fileEntries = [] as LocalFileEntry[]
  for (const file of files) {
    if (!file.stats) continue
    if (file.dirent.isFile()) {
      const path = file.path
      const last_modified = file.stats.mtimeMs
      // get hashes
      const [md5, sha1] = await multiHash(path)
        .then(hashes => [hashes['md5'], hashes['sha1']])
      const fileEntry: LocalFileEntry = {
        path: file.path,
        filename: file.name,
        name: cleanFileName(file.name),
        sha1: sha1 as MiniHash<'sha1'>,
        md5: md5 as MiniHash<'md5'>,
        size: file.stats.size,
        last_modified,
        optimized: false,
        alt: path.includes('/alt/'),
        video: path.endsWith('.webm'),
        img: path.endsWith('.webp'),
        svg: path.endsWith('.svg'),
      }
      // if image, get dimensions
      if (fileEntry.img) {
        const dimensions = await imageSizeFromFile(path)
        if (dimensions && dimensions.height) {
          fileEntry.height = dimensions.height
        }
      }
      // push
      fileEntries.push(fileEntry)
      log(`Crawled: ${path}`)
    }
  }
  // add to database
  addLocalFiles(fileEntries)
}
crawl(FILE_PATH)