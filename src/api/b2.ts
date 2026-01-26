// @ts-nocheck
import B2 from "backblaze-b2";
import fs from 'fs';

import { saveAuthContext } from 'backblaze-b2/lib/utils.js'
const AUTH_FILE = './.b2_auth.json'
const TOKEN_LIFETIME = 23 * 60 * 60 * 1000 // 24 hours (-1 for safety)

const b2 = new B2({
  applicationKeyId: process.env.B2_ID || '',
  applicationKey: process.env.B2_KEY || ''
})

let authCache = fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : null

let authPromise: Promise<any> | null = null

export const authorize = async () => {
  // check auth token cache
  // check expiry
  if (authCache?.expiryTimestamp > Date.now()) {
    saveAuthContext(b2, authCache)
    return authCache
  }
  console.log('B2 auth token expired or not found, authorizing...')
  // else authorize and cache
  // reuse auth promise for concurrent
  if (authPromise) return authPromise

  authPromise = b2.authorize()
    .then(res => {
      authCache = {
        ...res.data,
        expiryTimestamp: Date.now() + TOKEN_LIFETIME
      }
      fs.writeFileSync(AUTH_FILE, JSON.stringify(authCache), 'utf-8')
      authPromise = null
      return res.data
    }).catch(err => {
      authPromise = null
      throw err
    })
  return authPromise
}

const SOURCE_BUCKET_ID = process.env.B2_SOURCE_BUCKET_ID || ''
const BUCKET_PREFIX = process.env.B2_BUCKET_PREFIX || ''

async function listFiles(bucketId: string, startFileName: string = '') {
  const res = await b2.listFileNames({
    bucketId,
    maxFileCount: 10000,
    startFileName,
    prefix: "sources/"
  })
  return res.data
}

export async function listAllFiles() {
  await authorize()
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