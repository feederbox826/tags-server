type tagMedia = {
  name: string,
  alt: boolean,
  source: boolean,
  height?: number | "∞"
}

type exportTag = {
  img: tagMedia | {},
  vid: tagMedia | {},
  ignore: boolean,
  aliases?: string[],
  stashid?: string
}

type exportTags = Record<string, exportTag[]>

import { localDB, LocalFileEntry } from "../storage/local-db.js"
import { lookupDB, LookupEntry } from "../storage/lookup-db.js"
import { stashAppDB } from "../storage/stashapp-db.js"

const createMediaType = (file: LocalFileEntry): tagMedia => ({
  name: file.name,
  alt: file.alt,
  source: Boolean(file.src),
  height: file.svg ? "∞" : file.height || undefined
})

// construct export object
function createExport(): exportTags {
  // get all names
  const allNames = localDB.prepare(`SELECT DISTINCT name FROM localfiles`).all() as { name: string }[]
  // iterate through names
  const exportObj: exportTags = {}
  for (const entry of allNames) {
    const files = localDB.prepare(`SELECT * FROM localfiles WHERE name = ? AND alt = 0`).all(entry.name) as LocalFileEntry[]
    const tagEntry: Partial<exportTag> = {}
    for (const file of files) {
      const type = file.vid ? 'vid' : file.img ? 'img' : file.svg ? 'img' : 'unknown'
      if (type === 'unknown') continue
      tagEntry[type] = createMediaType(file)
    }
    // pull name, stashid from lookup
    const lookup = lookupDB.prepare(`SELECT * FROM lookup WHERE filename = ?`).get(entry.name) as LookupEntry | undefined
    if (lookup) {
      tagEntry.stashid = lookup.stashid
      tagEntry.aliases = (lookupDB.prepare(`SELECT alias FROM aliases WHERE stashid = ?`).all(lookup.stashid) as { alias: string }[]).map(a => a.alias)
      // use name to find ignore
      const stashappIgnore = stashAppDB.prepare(`SELECT ignore FROM tags WHERE name = ?`).get(lookup.name) as { ignore: number } | undefined
      tagEntry.ignore = Boolean(stashappIgnore?.ignore ?? false)
    }
  }
  return exportObj
}