import Fastify from "fastify";
import { LISTEN_PORT } from "./util/config.js";

const fastify = Fastify({
  logger: false
})

import { tagsExportHandler } from "./routes/tags-export.js"

fastify.get('/health', (request, reply) => { reply.send({ status: 'ok' }) })
fastify.get('/tags-export', tagsExportHandler)

fastify.listen({ port: LISTEN_PORT }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`server listening on ${address}`)
})