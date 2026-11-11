import debug from 'debug'
const log = debug('tags:tasks:lookup:populate')
const error = debug('tags:tasks:lookup:populate:error')
debug.enable('tags:*')

import { getTags, stashdbTagId } from '../../api/stashapp.js'
import { getAllTags } from '../../storage/stashapp-db.js'
import { tagLookup } from '../../api/stash-lookup.js'

export async function loadStashAppTags() {
  const ignored = new Set(
    getAllTags().filter(t => t.ignore).map(t => t.name)
  )
  const tags = await getTags()
  for (const tag of tags) {
    if (tag.ignore_auto_tag || ignored.has(tag.name)) continue
    const stashId = stashdbTagId(tag)
    if (!stashId) {
      error(`No stashdb id on tag: ${tag.name}`)
      continue
    }
    const res = await tagLookup(stashId).catch(() => null)
    if (res?.status == 404) {
      error(`Tag not found in lookup service: ${tag.name} (${stashId})`)
    }
  }
}
