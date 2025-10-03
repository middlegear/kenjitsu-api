import { Animepahe } from '@middlegear/hakai-extensions';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyQuery, FastifyParams } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const animepahe = new Animepahe();

export default function AnimepaheRoutes(fastify: FastifyInstance) {
  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300');
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');

    if (q.length > 1000) {
      return reply.status(400).send({ error: 'Query too long' });
    }
    if (!q.length) {
      return reply.status(400).send({ error: 'Query string cannot be empty' });
    }

    const result = await animepahe.search(q);

    if ('error' in result) {
      return reply
        .status(500)
        .send(
          `Open an issue with steps to reproduce the error in this repo:https://github.com/middlegear/API/issues. ${result}`,
        );
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
    const cacheKey = `animepahe-info-${animeId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await animepahe.fetchAnimeInfo(animeId);

    if ('error' in result) {
      return reply
        .status(500)
        .send(
          `Open an issue with steps to reproduce the error in this repo:https://github.com/middlegear/API/issues. ${result}`,
        );
    }

    if (
      result &&
      result.data !== null &&
      result.data.status &&
      Array.isArray(result.providerEpisodes) &&
      result.providerEpisodes.length > 0
    ) {
      result.data.status.toLowerCase() === 'finished airing' ? (duration = 0) : (duration = 12);
      await redisSetCache(cacheKey, result, duration);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/episodes/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    const animeId = request.params.animeId;

    if (!animeId) {
      return reply.status(400).send({
        error: `Missing required path paramater: 'animeId'`,
      });
    }

    const cacheKey = `pahe-episodes-${animeId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await animepahe.fetchEpisodes(animeId);

    if ('error' in result) {
      return reply
        .status(500)
        .send(
          `Open an issue with steps to reproduce the error in this repo:https://github.com/middlegear/API/issues. ${result}`,
        );
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 24);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/servers/:episodeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    const episodeId = request.params.episodeId;

    if (!episodeId) {
      return reply.status(400).send({
        error: `Missing required path paramater: 'episodeId'`,
      });
    }

    const cacheKey = `pahe-servers-${episodeId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await animepahe.fetchServers(episodeId);
    if ('error' in result) {
      return reply
        .status(500)
        .send(
          `Open an issue with steps to reproduce the error in this repo:https://github.com/middlegear/API/issues. ${result}`,
        );
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 24);
    }
    return reply.status(200).send(result);
  });

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

      const episodeId = request.params.episodeId;

      const category = (request.query.category as 'sub' | 'dub' | 'raw') || 'sub';

      if (!episodeId) {
        return reply.status(400).send({
          error: `Missing required path paramater: 'episodeId'`,
        });
      }

      const result = await animepahe.fetchSources(episodeId, category);

      if ('error' in result) {
        return reply
          .status(500)
          .send(
            `Open an issue with steps to reproduce the error in this repo:https://github.com/middlegear/API/issues. ${result}`,
          );
      }

      return reply.status(200).send(result);
    },
  );
}
