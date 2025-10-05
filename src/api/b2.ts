// @ts-nocheck
import B2 from "backblaze-b2";

const b2 = new B2({
  applicationKeyId: process.env.B2_ID || '',
  applicationKey: process.env.B2_KEY || ''
})

const SOURCE_BUCKET_ID = process.env.B2_SOURCE_BUCKET_ID || ''
const BUCKET_PREFIX = process.env.B2_BUCKET_PREFIX || ''

async function listFiles(bucketId: string, startFileName: string = '') {
  const res = await b2.listFileNames({
    bucketId,
    maxFileCount: 1000,
    startFileName,
  })
  return res.data
}

export async function listAllFiles() {
  await b2.authorize()
  const files = []
  let startFileName: string = ""
  while (true) {
    var res = await listFiles(SOURCE_BUCKET_ID, startFileName)
    files.push(...res.files)
    if (res.nextFileName) startFileName = res.nextFileName
    else break
  }
  return files
}

export default b2