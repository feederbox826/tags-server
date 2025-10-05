import debug from 'debug'
const log = debug('tags:tasks:import-tags')
debug.enable('tags:*')

import { getTags, getEtag, testEtag } from '../..//api/stashapp.js'
import { stashAppDB, stashAppDbTag, initDB, upsertTag } from '../../storage/stashapp-db.js'
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

function updateTab(id: number, path: string, md5: string): void {
  stashAppDB.prepare(`UPDATE tags SET md5 = ?, path = ? WHERE id = ?`).run(md5, path, id)
}

export async function importTags() {
  // initialize db
  initDB()
  const tags = await getTags()
  for (const tag of tags) {
    // filter out default tags
    if (tag.image_path?.includes("default=true")) continue
    const match = getTagByID(Number(tag.id))
    const etagResult = await getSetEtag(Number(tag.id), tag?.image_path ?? "", match?.md5)
    if (etagResult) {
      const ignore = tag.ignore_auto_tag || shouldIgnoreName(tag.name)
      log(`Tag: ${tag.name} (${tag.id}) - µMD5: ${etagResult}`)
      upsertTag(tag.name, tag.id, ignore, tag.image_path || null, etagResult)
    }
  }
}

const getSetEtag = async (id: number, path: string, currentEtag?: string): Promise<void | string> => {
  // check if our etag is valid
  // skip default
  if (path.includes("default=true")) return
  if (!path) return
  const etagValid = currentEtag && await testEtag(path, currentEtag)
  if (etagValid) return
  // get new etag
  const newEtag = await getEtag(path)
  if (!newEtag) {
    log(`Failed to get eTag for ${path}`)
    return
  }
  log(`Updating ETag for tag ${id} - µMD5: ${newEtag}`)
  updateTab(id, path, newEtag)
  return newEtag
}

export async function checkTags() {
  const tags = await getTags()
  for (const tag of tags) {
    if (!tag.image_path) continue
    const match = getTagByID(Number(tag.id))
    getSetEtag(Number(tag.id), tag.image_path, match?.md5)
  }
}

//importTags()
checkTags()