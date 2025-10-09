import Fastify from "fastify";
import { lookupRoute, lookupImgRoute, lookupVidRoute } from "./routes/lookup.js";
import { LISTEN_PORT } from "./util/config.js";

const fastify = Fastify({
  logger: false
})

fastify.get("/lookup/:tag", lookupRoute)
fastify.get("/lookup/img/:tag", lookupImgRoute)
fastify.get('/lookup/vid/:tag', lookupVidRoute)

fastify.get('/health', (request, reply) => { reply.send({ status: 'ok' }) })

fastify.listen({ port: LISTEN_PORT }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`server listening on ${address}`)
})