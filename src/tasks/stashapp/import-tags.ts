import debug from 'debug'
const log = debug('tags:tasks:import-tags')
debug.enable('tags:*')
import { tqdm } from "ts-tqdm"

import { getTags, getEtag, testEtag } from '../..//api/stashapp.js'
import { stashAppDB, stashAppDbTag, initDB, upsertTag, refresh } from '../../storage/stashapp-db.js'
import { EXCLUDED_TAG_PREFIX } from '../../util/config.js'

const shouldIgnoreName = (name: string): boolean => {
  for (const prefix of EXCLUDED_TAG_PREFIX) {
    if (name.startsWith(prefix)) return true
  }
  return false
}

function getTagByID(id: number): stashAppDbTag | null {
  const row = stashAppDB.prepare(`SELECT * FROM tags WHERE id = ?`).get(id)
  return row ? row as stashAppDbTag : null
}

function updateTag(id: number, path: string, md5: string): void {
  stashAppDB.prepare(`UPDATE tags SET md5 = ?, path = ? WHERE id = ?`).run(md5, path, id)
}

export async function checkTags() {
  initDB()
  const tags = await getTags()
  for (const tag of tqdm(tags)) {
    // preliminary ignore checks
    if (!tag?.image_path || tag.image_path?.includes("default=true")) continue
    const match = getTagByID(Number(tag.id))
    // if match, check etag, else add
    if (match) {
      const validEtag = await validateEtag(match, tag.image_path)
      if (validEtag) continue
    }
    // no match or if match outdated, add/update
    const ignore = tag.ignore_auto_tag || shouldIgnoreName(tag.name)
    const etag = await getEtag(tag.image_path)
    if (!etag) {
      log(`Failed to get ETag for ${tag.image_path}`)
      continue
    }
    if (match) {
      log(`Update ETag for tag ${tag.id} - µMD5: ${etag}`)
      updateTag(Number(tag.id), tag.image_path, etag)
      continue
    } else {
      log(`New tag: ${tag.name} (${tag.id}) - µMD5: ${etag}`)
      upsertTag(tag.name, tag.id, ignore, tag.image_path || null, etag)
    }
  }
  log(`Done. Total tags: ${tags.length}`)
  refresh()
}

async function validateEtag(tag: stashAppDbTag, path: string): Promise<boolean> {
  const etagValid = tag?.md5 && await testEtag(path, tag.md5)
  return Boolean(etagValid)
}