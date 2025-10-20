import { Anizone } from '@middlegear/kenjitsu-extensions';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyQuery, FastifyParams } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const anizone = new Anizone();

export default function AnizoneRoutes(fastify: FastifyInstance) {
  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300');
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');

    if (!q.length) {
      return reply.status(400).send({ error: "Missing required query params: 'q' " });
    }
    if (q.length > 1000) {
      return reply.status(400).send({ error: 'query string too long' });
    }

    const result = await anizone.search(q);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/recent-updates', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const result = await anizone.fetchUpdates();
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/info/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${2 * 60 * 60}, stale-while-revalidate=300`);

    const animeId = request.params.animeId;

    if (!animeId) {
      return reply.status(400).send({
        error: `Missing required path paramater: 'animeId'`,
      });
    }
    let duration;
    const cacheKey = `anizone-info-${animeId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await anizone.fetchInfo(animeId);
    if ('error' in result) {
      return reply.status(500).send(result);
    }
    if (
      result &&
      result.data !== null &&
      result.data.status &&
      Array.isArray(result.providerEpisodes) &&
      result.providerEpisodes.length > 0
    ) {
      result.data.status.toLowerCase() === 'completed' ? (duration = 0) : (duration = 1);
      await redisSetCache(cacheKey, result, duration);
    }
    return reply.status(200).send(result);
  });

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

      const episodeId = request.params.episodeId;

      if (!episodeId) {
        return reply.status(400).send({
          error: `Missing required path paramater: 'episodeId'`,
        });
      }

      const result = await anizone.fetchSources(episodeId);
      if ('error' in result) {
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    },
  );
}
