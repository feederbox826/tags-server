import axios from 'axios'

export type LookupTag = {
  uuid: string
  name: string
  aliases: string[]
  category?: string | null
}

const lookupClient = axios.create({
  baseURL: 'https://lookup.feederbox.cc/api/',
})

export const nameLookup = (name: string) =>
  lookupClient.get<LookupTag[]>(`lookup/tags/${name}`)

export const tagLookup = (id: string) =>
  lookupClient.get<LookupTag[]>(`id/tags/${id}`)
