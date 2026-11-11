import { localDB, LocalFileEntry } from "../storage/local-db.js"
import { stashAppDB } from "../storage/stashapp-db.js"
import { FastifyRequest, FastifyReply } from "fastify"
import { nameLookup, LookupTag } from "../api/stash-lookup.js"

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

const createMediaType = (file: LocalFileEntry): tagMedia => ({
  name: file.filename,
  alt: Boolean(file.alt),
  source: Boolean(file.src),
  height: file.svg ? "∞" : file.height || undefined
})

async function resolveTag(name: string): Promise<LookupTag | undefined> {
  const attempts = [name, name.replace(/_/g, ' ')]
  for (const attempt of attempts) {
    const res = await nameLookup(attempt).catch(() => null)
    const match = res?.data?.[0]
    if (match) return match
  }
}

async function createExport(): Promise<exportTags> {
  const allNames = localDB.prepare(`SELECT DISTINCT name FROM localfiles`).all() as { name: string }[]
  const exportObj: exportTags = {}
  for (const entry of allNames) {
    const files = localDB.prepare(`SELECT * FROM localfiles WHERE name = ? AND alt = 0`).all(entry.name) as LocalFileEntry[]
    const tagEntry: Partial<exportTag> = {}
    for (const file of files) {
      const type = file.vid ? 'vid' : file.img ? 'img' : file.svg ? 'img' : 'unknown'
      if (type === 'unknown') continue
      tagEntry[type] = createMediaType(file)
    }
    const lookup = await resolveTag(entry.name)
    if (lookup) {
      tagEntry.stashid = lookup.uuid
      tagEntry.aliases = lookup.aliases
      const stashappIgnore = stashAppDB.prepare(`SELECT ignore FROM tags WHERE name = ?`).get(lookup.name) as { ignore: number } | undefined
      tagEntry.ignore = Boolean(stashappIgnore?.ignore ?? false)
    }
    exportObj[entry.name] = [tagEntry as exportTag]
  }
  return exportObj
}

export async function tagsExportHandler(request: FastifyRequest, reply: FastifyReply) {
  const exportObj = await createExport()
  return reply.send(exportObj)
}
