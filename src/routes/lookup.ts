import { FastifyRequest, FastifyReply } from 'fastify'

import { lookupDB, lookup, getName } from '../storage/lookup-db.js'
import { localDB, LocalFileEntry } from '../storage/local-db.js'
import { UUID } from 'crypto'
import { MEDIA_HOSTNAME } from '../util/config.js'

export const lookupImgRoute = (request: FastifyRequest, reply: FastifyReply) => lookupRoute(request, reply, 'img')
export const lookupVidRoute = (request: FastifyRequest, reply: FastifyReply) => lookupRoute(request, reply, 'vid')

export async function lookupRoute (request: FastifyRequest, reply: FastifyReply, type: 'img' | 'vid' | 'any' = 'any') {
  // supported route params:
  // /lookup/:(img/vid)/:tagname
  // tagname can be stashid, name or alias
  // supported query params:
  // ?b2=1 (boolean) - send b2 link if available
  // ?optimized=1 (boolean) - send optimized link if available (img only)
  // ?alt=1 (boolean) - send alt link (randomized)
  // ?help=1 (boolean) - show help

  const params = request.params as { tag: string }
  const query = request.query as { help?: string }

  if (query.help || !params.tag) {
    return reply.send({
      message: `
      Supported route params:
        /lookup/:(img/vid)/:tagname
        tagname can be stashdb id, name or alias
        if img/vid is specified, will only return if matching type, otherwise vid > img
      Supported query params:
        ?help=1 (boolean) - show help
      `
    })
  }
  // get stashid
  const stashid = getStashID(params.tag)
  if (!stashid) {
    return reply.status(404).send({ error: 'Tag not found' })
  }
  const name = getName(stashid as UUID)
  // no alt, pass off to caddy handler since it's faster
  const typeString = type == "any" ? "" : `${type}/`
  return reply.redirect(`${MEDIA_HOSTNAME}/${typeString}${name}`, 302)
}

const getStashID = (tag: string): string | null => {
  if (tag.length == 36) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(tag)) return tag
  }
  // lookup against db
  return lookup(tag)
}