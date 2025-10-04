import debug from 'debug'
const log = debug('tags:api:stashapp')

import axios from 'axios'
import { USER_AGENT, ALLOWED_MIME_TYPES } from '../util/config.js'
import { Agent as httpsAgent } from 'https'
import { fullMD5, miniMD5, toMiniMD5, toFullMD5 } from '../util/miniMD5.js'

const stashappClient = axios.create({
  headers: { 'ApiKey': process.env.STASHAPP_API_KEY, 'User-Agent': USER_AGENT },
  baseURL: process.env.STASHAPP_URL || 'http://localhost:9999/graphql',
  method: 'POST',
  timeout: 30000,
  validateStatus: (status) => status >= 200 && status < 300 || status === 304,
  httpsAgent: new httpsAgent({ rejectUnauthorized: false }),
})

const stashappQuery = (query: string, variables = {}) =>
  stashappClient.post('',{ query, variables })

// END declarations

type stashAppTag = {
  name: string,
  aliases: string[],
  image_path?: string | null,
  id: string,
  ignore_auto_tag: boolean
}

export async function getTags(): Promise<stashAppTag[]> {
  const query = `query {
    findTags(filter: { per_page: -1 }) {
    tags {
      name aliases image_path id ignore_auto_tag
    }}}`
  const response = await stashappQuery(query)
  return response.data.data.findTags.tags
}

export async function getEtag(path: string): Promise<miniMD5 | null> {
  const md5req = await stashappClient.get(path)
  // check mimetype before caching
  const contentType = md5req.headers['content-type'] || ''
  if (!ALLOWED_MIME_TYPES.includes(contentType)) return null
  const etag: string | undefined = md5req.headers['etag']
  return etag ? toMiniMD5(etag.replace('"', '') as fullMD5) : null // remove quotes
}

export async function testEtag(path: string, etag: miniMD5): Promise<boolean> {
  const req = await stashappClient.get(path, { headers: { 'If-None-Match': `"${toFullMD5(etag)}"` } })
  return req.status === 304
}