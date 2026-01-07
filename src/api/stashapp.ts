import debug from 'debug'
const log = debug('tags:api:stashapp')

import axios from 'axios'
import { USER_AGENT } from '../util/config.js'
import { Agent as httpsAgent } from 'https'

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

export type stashAppTag = {
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

export async function getEtags(): Promise<Map<number, string>> {
  const query = `mutation {
  querySQL(sql: "SELECT id, image_blob FROM tags") {
    rows
  }}`
  const response = await stashappQuery(query)
  const etags: Map<number, string> = new Map()
  for (const row of response.data.data.querySQL.rows) {
    const id: number = row[0]
    const blobPath: string | "null" = row[1]
    if (blobPath != "null") {
      etags.set(id, blobPath)
    }
  }
  return etags
}