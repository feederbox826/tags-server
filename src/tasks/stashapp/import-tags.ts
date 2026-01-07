import debug from 'debug'
const log = debug('tags:tasks:import-tags')
debug.enable('tags:*')
import { tqdm } from "ts-tqdm"

import { getTags, getEtags, stashAppTag } from '../../api/stashapp.js'
import { stashAppDB, stashAppDbTag, initDB, upsertTag, refresh } from '../../storage/stashapp-db.js'
import { EXCLUDED_TAG_PREFIX } from '../../util/config.js'
import { toMiniHash } from '../../util/miniHash.js'

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
  const etagMap = await getEtags()
  for (const tag of tqdm(tags)) {
    const stashTag = tag as stashAppTag
    // preliminary ignore checks
    if (!stashTag?.image_path || stashTag.image_path?.includes("default=true")) continue
    const match = getTagByID(Number(stashTag.id))
    // fetch etag directly from db
    const etag = etagMap.get(Number(stashTag.id))
    if (!etag) {
      log(`No ETag found for tag ${stashTag.name} (${stashTag.id})`)
      continue
    }
    const miniEtag = toMiniHash(etag)
    // if match, check etag, else add
    if (match) {
      // update name if changed
      if (match.name !== stashTag.name) {
        log(`Update name for tag ${stashTag.id}: ${match.name} -> ${stashTag.name}`)
        stashAppDB.prepare(`UPDATE tags SET name = ? WHERE id = ?`).run(stashTag.name, stashTag.id)
      }
      // validate etag matches
      const validEtag = miniEtag == match?.md5;
      // if no match, update
      if (!validEtag) {
        log(`Update ETag for tag ${stashTag.name} - µMD5: ${miniEtag}`)
        updateTag(Number(stashTag.id), stashTag.image_path, miniEtag || '')
      }
      continue
    } else { // no match, add new
      const ignore = stashTag.ignore_auto_tag || shouldIgnoreName(stashTag.name)
      log(`New tag: ${stashTag.name} (${stashTag.id}) - µMD5: ${miniEtag}`)
      upsertTag(stashTag.name, stashTag.id, ignore, stashTag.image_path || null, miniEtag)
    }
  }
  log(`Done. Total tags: ${tags.length}`)
  refresh()
}