// first import from stashapp
import debug from 'debug'
const log = debug('tags:tasks:run-all')
debug.enable('tags:*')
log('Starting runall tasks...')
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
// clean src files
log("Deleting local files with source")
import { delHasSrc } from './maintenance/delete-src.js'
await delHasSrc('D:\\Workspace\\stashtag\\no-src')