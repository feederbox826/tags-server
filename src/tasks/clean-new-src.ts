// first import from stashapp
import debug from 'debug'
const log = debug('tags:tasks:clean-new-src')
debug.enable('tags:*')
log('Starting clean-new-src tasks...')
log("Crawling local files")
// finally find source files
log("Finding source files from B2")
import { getSourceFiles } from './b2/findsrc.js'
await getSourceFiles()
// clean src files
log("Deleting local files with source")
import { delHasSrc } from './maintenance/delete-src.js'
await delHasSrc('D:\\Workspace\\stashtag\\no-src')