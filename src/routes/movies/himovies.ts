import { Himovies } from '@middlegear/hakai-extensions';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const himovies = new Himovies();
export default async function HimoviesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await himovies.fetchHome();

    if ('error' in result) {
      return reply.status(500).send({
        trending: result.trending,
        recentReleases: result.recentReleases,
      });
    }
  });
}
