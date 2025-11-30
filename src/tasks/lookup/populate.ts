// run interactively as a test
import debug from 'debug'
const log = debug('tags:tasks:lookup:populate')
const error = debug('tags:tasks:lookup:populate:error')
debug.enable('tags:*')

// set up db
import { getStashTag } from '../../api/stashdb.js';
import { lookupDB, initDB, upsertTag, lookup } from '../../storage/lookup-db.js'
import { getAllTags } from '../../storage/stashapp-db.js';

export async function loadStashAppTags() {
  initDB()
  // load tags from stashapp
  const stashAppTags = getAllTags()
  for (const tag of stashAppTags) {
    // skip ignored tags
    if (tag.ignore) continue
    // check if tag exists in db
    const dbMatch = lookup(tag.name)
    if (dbMatch) continue
    // lookup in stashdb
    const stashDBRes = await getStashTag(tag.name)
    if (stashDBRes) {
      // add to db
      upsertTag(stashDBRes.id, stashDBRes.name, stashDBRes.aliases)
      log(`Upserted tag: ${stashDBRes.name} (${stashDBRes.id}) with aliases: ${stashDBRes.aliases.join(", ")}`)
    } else {
      error(`Tag not found in StashDB: ${tag.name}`)
    }
  }
  lookupDB.close()
}

// loadStashAppTags()