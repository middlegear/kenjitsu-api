import { Animepahe } from '@middlegear/kenjitsu-extensions';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyQuery, FastifyParams } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const animepahe = new Animepahe();

export default async function AnimepaheRoutes(fastify: FastifyInstance) {
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

    try {
      const result = await animepahe.search(q);

      if ('error' in result) {
        request.log.error({ result, q }, `External API Error: Failed to fetch search results for query:${q}`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occured while querying search results`);
      return reply.status(500).send({ error: `Internal server error occured:${error}` });
    }
  });

  fastify.get('/recent-episodes', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const page = request.query.page || 1;

    try {
      const result = await animepahe.fetchRecentlyUpdated(page);
      if ('error' in result) {
        request.log.error({ result, page }, `External API Error: Failed to fetch recent episodes results`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occured while fetching recent episodes`);
      return reply.status(500).send({ error: `Internal server occured:${error}` });
    }
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

    try {
      const result = await animepahe.fetchAnimeInfo(animeId);
      if ('error' in result) {
        request.log.error({ result, animeId }, `External API Error: Failed to fetch anime info`);
        return reply.status(500).send(result);
      }
      if (
        result &&
        result.data !== null &&
        result.data.status &&
        Array.isArray(result.providerEpisodes) &&
        result.providerEpisodes.length > 0
      ) {
        result.data.status.toLowerCase() === 'finished airing' ? (duration = 0) : (duration = 1);
        await redisSetCache(cacheKey, result, duration);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occured while fetching anime info`);
      return reply.status(500).send({ error: `Internal server occured:${error}` });
    }
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

    try {
      const result = await animepahe.fetchEpisodes(animeId);
      if ('error' in result) {
        request.log.error({ result, animeId }, `External API Error: Failed to fetch episodes`);
        return reply.status(500).send(result);
      }
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 24);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occured while fetching episodes`);
      return reply.status(500).send({ error: `Internal server occured:${error}` });
    }
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

    try {
      const result = await animepahe.fetchServers(episodeId);
      if ('error' in result) {
        request.log.error({ result, episodeId }, `External API Error: Failed to fetch servers`);
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 12);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occured while fetching streaming server info`);
      return reply.status(500).send({ error: `Internal server occured:${error}` });
    }
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

      try {
        const result = await animepahe.fetchSources(episodeId, category);

        if ('error' in result) {
          request.log.error({ result, episodeId, category }, `External API Error: Failed to fetch sources`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occured while fetching sources`);
        return reply.status(500).send({ error: `Internal server occured:${error}` });
      }
    },
  );
}
