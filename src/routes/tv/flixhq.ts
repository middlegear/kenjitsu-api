import { FlixHQ } from '@middlegear/hakai-extensions';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { FastifyParams, FastifyQuery } from '../../utils/types.js';
import { toFlixServers } from '../../utils/utils.js';

const flixhq = new FlixHQ();

export default async function FlixHQRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'Welcome to FlixHQ provider' });
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');

    if (q.length > 100) {
      return reply.status(400).send({ error: 'Query string too long' });
    }
    if (!q.length) {
      return reply.status(400).send({ error: 'Query string cannot be empty' });
    }

    reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300');

    const page = Number(request.query.page) || 1;
    const result = await flixhq.search(q, page);

    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
      });
    }
    return reply.send({
      currentPage: result.currentPage,
      hasNextPage: result.hasNextPage,
      data: result.data,
    });
  });

  fastify.get('/info/:mediaId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const mediaId = String(request.params.mediaId);

    reply.header('Cache-Control', 's-maxage=43200, stale-while-revalidate=300');

    const result = await flixhq.fetchMediaInfo(mediaId);
    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        episodes: result.episodes,
      });
    }

    return reply.send({
      data: result.data,
      episodes: result.episodes,
    });
  });

  fastify.get('/servers/:episodeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const episodeId = String(request.params.episodeId);

    reply.header('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    const results = await flixhq.fetchMediaServers(episodeId);

    if ('error' in results) {
      return reply.status(500).send({
        error: results.error,
        data: results.data,
      });
    }

    return reply.send({
      data: results.data,
    });
  });

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const server = request.query.server || 'vidcloud';
      const validateServer = toFlixServers(server);
      reply.header('Cache-Control', 's-maxage=300, stale-while-revalidate=180');

      const results = await flixhq.fetchSources(episodeId, validateServer);

      if ('error' in results) {
        return reply.status(500).send({ error: results.error, data: results.data });
      }
      return reply.send({
        headers: results.headers,
        data: results.data,
      });
    },
  );
}
