import debug from 'debug'
const log = debug('tags:tasks:import-tags')
debug.enable('tags:*')
import { tqdm } from "ts-tqdm"

import { getTags, getEtag, testEtag, stashAppTag } from '../../api/stashapp.js'
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
    const stashTag = tag as stashAppTag
    // preliminary ignore checks
    if (!stashTag?.image_path || stashTag.image_path?.includes("default=true")) continue
    const match = getTagByID(Number(stashTag.id))
    // if match, check etag, else add
    if (match) {
      // update name if changed
      if (match.name !== stashTag.name) {
        log(`Update name for tag ${stashTag.id}: ${match.name} -> ${stashTag.name}`)
        stashAppDB.prepare(`UPDATE tags SET name = ? WHERE id = ?`).run(stashTag.name, stashTag.id)
      }
      const validEtag = await validateEtag(match, stashTag.image_path)
      if (validEtag) continue
    }
    // no match or if match outdated, add/update
    const ignore = stashTag.ignore_auto_tag || shouldIgnoreName(stashTag.name)
    const etag = await getEtag(stashTag.image_path)
    if (!etag) {
      log(`Failed to get ETag for ${stashTag.image_path}`)
      continue
    }
    if (match) {
      log(`Update ETag for tag ${stashTag.name} - µMD5: ${etag}`)
      updateTag(Number(stashTag.id), stashTag.image_path, etag)
      continue
    } else {
      log(`New tag: ${stashTag.name} (${stashTag.id}) - µMD5: ${etag}`)
      upsertTag(stashTag.name, stashTag.id, ignore, stashTag.image_path || null, etag)
    }
  }
  log(`Done. Total tags: ${tags.length}`)
  refresh()
}

async function validateEtag(tag: stashAppDbTag, path: string): Promise<boolean> {
  const etagValid = tag?.md5 && await testEtag(path, tag.md5)
  return Boolean(etagValid)
}