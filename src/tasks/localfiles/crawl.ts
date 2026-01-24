const FILE_PATH = "tags"

import debug from 'debug'
const log = debug('tags:tasks:localfiles:crawl')
debug.enable('tags:*')
import { tqdm } from "ts-tqdm"

import * as fsWalk from '@nodelib/fs.walk'
import { imageSizeFromFile } from 'image-size/fromFile'
import fs from 'fs/promises'
import path from 'path'
// @ts-ignore
import VideoLength from "video-length"

import { localDB, inittDB, LocalFileEntry } from '../../storage/local-db.js'
import { multiHash } from '../../util/multihash.js'

const cleanFileName = (name: string) => name.replace(/( \(\d\))?\.\w+/, '')

function checkLocalFiles(path: string): void {
  const files = localDB.prepare(`SELECT path, last_modified FROM localfiles`).all() as LocalFileEntry[]
  for (const file of files) {
    const fullPath = path + '/' + file.path
    // check if file exists
    fs.stat(fullPath)
      .catch(e => {
        if (e.code === 'ENOENT') {
          log(`File missing, removing from DB: ${file.path}`)
          // remove from db
          localDB.prepare(`DELETE FROM localfiles WHERE path = ?`).run(file.path)
        } else {
          log(`Error checking file ${file.path}: ${e.message}`)
        }
      })
  }
}

function addLocalFiles(files: LocalFileEntry[]): void {
  const insert = localDB.prepare(`
    INSERT OR REPLACE INTO localfiles (path, name, filename, sha1, md5, size, last_modified, alt, vid, img, svg, height, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        file.vid ? 1 : 0,
        file.img ? 1 : 0,
        file.svg ? 1 : 0,
        file.height || 0,
        file.duration || null,
      )
    }
  })
  insertMany(files)
}

async function crawlFile(directory: string, file: fsWalk.Entry): Promise<LocalFileEntry> {
  if (!file.stats) throw new Error('File stats not available')
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
    alt: basePath.match(/(^|\\|\/)alt(\\|\/)/) ? true : false,
    vid: basePath.endsWith('.webm'),
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
  // if video, get duration and height
  if (fileEntry.vid) {
    // use ffprobe to get duration
    try {
      const info = await VideoLength(realPath, { extended: true, bin: "E:\\Applications\\bin\\MediaInfo.exe" })
      fileEntry.duration = Math.floor(info.duration)
      fileEntry.height = info.height
    } catch {
      log(`mediainfo failed for file: ${realPath}`)
    }
  }
  return fileEntry
}


export async function crawl(directory: string): Promise<void> {
  inittDB()
  const files = fsWalk.walkSync(directory, { basePath: "", stats: true, followSymbolicLinks: true })
  const fileEntries = [] as LocalFileEntry[]
  for (const file of tqdm(files)) {
    if (!file.stats) continue
    if (file.dirent.isFile()) {
      // look for match and check mtime and size
      const cleanPath = file.path.toString().replace(/\\/g, '/')
      const existing = localDB.prepare(`SELECT svg, img, vid, last_modified, size, height, duration FROM localfiles WHERE path = ?`).get(cleanPath) as LocalFileEntry
      const isUpToDate = existing && (existing.svg || (existing.img && existing.height) || (existing.vid && existing.duration && existing.height))
      if (isUpToDate) {
        const lmCheck = file.stats.mtimeMs / 1000 == existing.last_modified
        const sizeCheck = file.stats.size === existing.size
        if (lmCheck && sizeCheck) {
          // log(`Skipping (unchanged): ${file.path}`)
          continue
        } else if (!lmCheck) {
          log(`Updating (mtime changed): ${cleanPath}`)
        } else if (!sizeCheck) {
          log(`Updating (size changed): ${cleanPath}`)
        }
      }
      const fileEntry = await crawlFile(directory, file)
      // push
      fileEntries.push(fileEntry)
      log(`Crawled: ${cleanPath}`)
    }
  }
  // add to database
  addLocalFiles(fileEntries)
  // check for missing files
  checkLocalFiles(directory)
}
// crawl(FILE_PATH)