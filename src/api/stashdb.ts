import axios from 'axios'
import { UUID } from 'crypto'

const stashDBClient = axios.create({
  baseURL: "https://stashdb.org/graphql",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "ApiKey": process.env.STASHDB_API_KEY,
  }
})

type StashDBTag = {
  name: string,
  deleted: boolean,
  id: UUID,
  aliases: string[]
}

export async function getStashTag(tagName: string): Promise<StashDBTag | null> {
  const query = `query ($name: String!) {
    findTagOrAlias(name: $name) { name deleted id aliases }}`
  const variables = { name: tagName }
  const response = await stashDBClient.post('', { query, variables })
  return response.data.data.findTagOrAlias
}