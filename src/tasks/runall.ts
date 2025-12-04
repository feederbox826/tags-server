// first import from stashapp
import debug from 'debug'
const log = debug('tags:tasks:run-all')
debug.enable('tags:*')
log('Starting runall tasks...')
log("Importing tags from stashapp")
import { checkTags } from './stashapp/import-tags.js'
await checkTags()
// validate stashapp files
log("Validating stashapp files")
import { findDifferingFiles } from './stashapp/validate-files.js'
await findDifferingFiles()
// populate from stashdb
log("Populating from stashdb")
import { loadStashAppTags } from './lookup/populate.js'
await loadStashAppTags()
// crawl local files
log("Crawling local files")
const FILE_PATH = 'D:\\Workspace\\stashtag\\local-mirror'
import { crawl } from './localfiles/crawl.js'
await crawl(FILE_PATH)
// dedupe local files
log("Finding duplicate local files")
import { getDupeHashes } from './localfiles/dupes.js'
await getDupeHashes()
// finally find source files
log("Finding source files from B2")
import { getSourceFiles } from './b2/findsrc.js'
await getSourceFiles()