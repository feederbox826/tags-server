import debug from 'debug'
import fs from 'fs'
const log = debug('tags:tasks:lookup:populate')
const error = debug('tags:tasks:lookup:populate:error')
debug.enable('tags:*')

import { getTags, stashdbTagId } from '../../api/stashapp.js'
import { getAllTags } from '../../storage/stashapp-db.js'
import { tagLookup } from '../../api/stash-lookup.js'

// load from json cache
const CACHE_PATH = 'db/lookup.json'
const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
const cacheSet = new Set(cache)

export async function loadStashAppTags() {
  const ignored = new Set(
    getAllTags().filter(t => t.ignore).map(t => t.name)
  )
  const tags = await getTags()
  for (const tag of tags) {
    // check if exists in set
    if (tag.ignore_auto_tag || ignored.has(tag.name)) continue
    const stashId = stashdbTagId(tag)
    if (!stashId) {
      error(`No stashdb id on tag: ${tag.name}`)
      continue
    }
    if (cacheSet.has(stashId)) continue
    const res = await tagLookup(stashId).catch(() => null)
    if (res?.status == 404) {
      error(`Tag not found in lookup service: ${tag.name} (${stashId})`)
      continue
    }
    const match = res?.data?.[0]
    if (!match) continue
    cacheSet.add(stashId)
  }
  // save cache
  fs.writeFileSync(CACHE_PATH, JSON.stringify(Array.from(cacheSet)), 'utf-8')
}
