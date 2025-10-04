import debug from 'debug'
const log = debug('tags:tasks:import-tags')
debug.enable('tags:*')

import { getTags, getEtag, testEtag } from '../..//api/stashapp.js'
import { initDB, getTagByID, upsertTag, setMD5 } from '../../storage/stashapp-db.js'
import { EXCLUDED_TAG_PREFIX } from '../../util/config.js'

const shouldIgnoreName = (name: string): boolean => {
  for (const prefix of EXCLUDED_TAG_PREFIX) {
    if (name.startsWith(prefix)) return true
  }
  return false
}

export async function importTags() {
  // initialize db
  await initDB()

  const tags = await getTags()
  for (const tag of tags) {
    // filter out default tags
    if (tag.image_path?.includes("default=true")) continue
    const etag = tag.image_path ? await getEtag(tag.image_path) : null
    const match = await getTagByID(Number(tag.id))
    if (match && match.md5 === etag) {
      log(`Skipping ${tag.name} (${tag.id}), no change`)
      continue
    }
    const ignore = tag.ignore_auto_tag || shouldIgnoreName(tag.name)
    log(`Tag: ${tag.name} (${tag.id}) - µMD5: ${etag}`)
    upsertTag(tag.name, tag.id, ignore, tag.image_path || null, etag || null)
  }
}

export async function checkTags() {
  const tags = await getTags()
  for (const tag of tags) {
    if (!tag.image_path) continue
    const match = await getTagByID(Number(tag.id))
    if (!match?.md5) continue
    const etagValid = await testEtag(tag.image_path, match.md5)
    if (!etagValid) {
      // file changed, update
      const newEtag = await getEtag(tag.image_path)
      log(`Tag changed: ${tag.name} (${tag.id}) - µMD5: ${newEtag}`)
      setMD5(tag.image_path, newEtag || '')
    }
  }
}

checkTags()