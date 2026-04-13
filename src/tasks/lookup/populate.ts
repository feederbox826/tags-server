// run interactively as a test
import debug from 'debug'
const log = debug('tags:tasks:lookup:populate')
const error = debug('tags:tasks:lookup:populate:error')
debug.enable('tags:*')

// set up db
import { lookupDB, initDB, upsertTag, lookup } from '../../storage/lookup-db.js'
import { getAllTags } from '../../storage/stashapp-db.js';
import { nameLookup } from '../../api/stash-lookup.js';

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
    const lookupRes = await nameLookup(tag.name).catch(err => null)
    const match = lookupRes?.data?.[0]
    if (match) {
      upsertTag(match.uuid, match.name, match.aliases)
      log(`Upserted tag from lookup: ${match.name} (${match.uuid}) with aliases: ${match.aliases.join(", ")}`)
    } else {
      error("Tag not found in lookup service: " + tag.name)
    }
  }
  lookupDB.close()
}

// loadStashAppTags()