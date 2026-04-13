import axios from 'axios'

const lookupClient = axios.create({
  baseURL: "https://lookup.feederbox.cc/api/",
})

export const nameLookup = (name: string) => lookupClient.get(`lookup/tags/${name}`) 

export const tagLookup = (id: string) => lookupClient.get(`id/tags/${id}`)