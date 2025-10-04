// run interactively as a test
import debug from 'debug'
const log = debug('tags:tasks:lookup:populate')

// set up db
import { getStashTag } from '../../api/stashdb.js';
import { initDB, upsertTag, closeDB } from '../../storage/lookup-db.js'
initDB()

import axios from 'axios'

const tagsJSON = await axios.get("https://tags.feederbox.cc/tags-export.json")
  .then(res => res.data as any[])

const fuseArr = []

const names = Object.keys(tagsJSON)
for (const name of names) {
  // lookup name and cache
  const stashDBRes = await getStashTag(name)
  if (stashDBRes) {
    // add to db
    await upsertTag(stashDBRes.id, stashDBRes.name, stashDBRes.aliases)
    log(`Upserted tag: ${stashDBRes.name} (${stashDBRes.id}) with aliases: ${stashDBRes.aliases.join(", ")}`)
    // add to fuse index
    fuseArr.push({ name, aliases: stashDBRes.aliases ? stashDBRes.aliases : [] })
  }
}
// pull tags from json
closeDB()