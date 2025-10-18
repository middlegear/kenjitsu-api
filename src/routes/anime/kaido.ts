import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Kaido, type HIGenre, type IAnimeCategory } from '@middlegear/kenjitsu-extensions';
import { IAnimeCategoryArr, type FastifyParams, type FastifyQuery } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';
const zoro = new Kaido();

export default async function KaidoRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const result = await zoro.fetchHome();

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');

    if (!q.length) {
      return reply.status(400).send({ error: "Missing required query params: 'q' " });
    }
    if (q.length > 1000) {
      return reply.status(400).send({ error: 'query string too long' });
    }

    const page = Number(request.query.page) || 1;

    const result = await zoro.search(q, page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/suggestions', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');

    if (!q.length) {
      return reply.status(400).send({ error: "Missing required query params: 'q' " });
    }
    if (q.length > 1000) {
      return reply.status(400).send({ error: 'query string too long' });
    }

    const result = await zoro.searchSuggestions(q);
    if ('error' in result) {
      return reply.status(500).send(result);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/info/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const animeId = String(request.params.animeId);

    let duration;
    const cacheKey = `kaido-info-${animeId}`;
    const cachedData = await redisGetCache(cacheKey);

    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await zoro.fetchAnimeInfo(animeId);
    if ('error' in result) {
      return reply.status(500).send(result);
    }
    if (
      result &&
      result.data !== null &&
      result.providerEpisodes.length > 0 &&
      result.data.type?.toLowerCase() !== 'movie'
    ) {
      result.data.status?.toLowerCase() === 'finished airing' ? (duration = 0) : (duration = 2);
      await redisSetCache(cacheKey, result, duration);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    const cacheKey = `kaido-topairing-${page}`;
    const cachedData = await redisGetCache(cacheKey);

    if (cachedData) {
      return reply.status(200).send(cachedData);
    }
    const result = await zoro.fetchTopAiring(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 24);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/favourites', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const cacheKey = `kaido-favourites-${page}`;
    const cachedData = await redisGetCache(cacheKey);

    if (cachedData) {
      return reply.status(200).send(cachedData);
    }
    const result = await zoro.fetchMostFavourites(page);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/most-popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    const cacheKey = `kaido-popular-${page}`;
    const cachedData = await redisGetCache(cacheKey);

    if (cachedData) {
      return reply.status(200).send(cachedData);
    }
    const result = await zoro.fetchMostPopular(page);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/recently-completed', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const cacheKey = `kaido-recently-completed-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await zoro.fetchRecentlyCompleted(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }
    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 24);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/recently-updated', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const cacheKey = `kaido-recently-updated-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await zoro.fetchRecentlyUpdated(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 1);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/recently-added', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const cacheKey = `kaido-recently-added-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await zoro.fetchRecentlyAdded(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 1);
    }
    return reply.status(200).send(result);
  });

  fastify.get(
    '/az-list/:sort',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

      const page = Number(request.query.page) || 1;
      const sort = String(request.params.sort);

      const cacheKey = `kaido-sort-${sort}-${page}`;

      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await zoro.fetchAtoZList(sort, page);

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 168);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get('/subbed', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${72 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const cacheKey = `kaido-subbed-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await zoro.fetchSubbedAnime(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }
    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/dubbed', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${72 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const cacheKey = `kaido-dubbed-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await zoro.fetchDubbedAnime(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }
    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/category', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    const format = (request.query.format as IAnimeCategory) || 'TV';

    if (!format) {
      return reply.status(400).send({
        error: "Missing required query parameter: 'format'.",
      });
    }
    if (!IAnimeCategoryArr.includes(format)) {
      return reply.status(400).send({
        error: `Invalid format: '${format}'. Expected one of ${IAnimeCategoryArr.join(', ')}.`,
      });
    }

    const cacheKey = `kaido-category-${format}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await zoro.fetchAnimeCategory(format, page);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get(
    '/genre/:genre',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${48 * 60 * 60}, stale-while-revalidate=300`);

      const page = Number(request.query.page) || 1;
      const genre = request.params.genre as HIGenre;
      if (!genre) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'genre'.",
        });
      }

      const cacheKey = `kaido-genre-${genre}-${page}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await zoro.fetchGenre(genre, page);

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 168);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get('/episodes/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const animeId = String(request.params.animeId);

    const cacheKey = `kaido-episodes-${animeId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    if (!animeId) {
      return reply.status(400).send({
        error: "Missing required path parameter: 'animeId'.",
      });
    }
    const result = await zoro.fetchEpisodes(animeId);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 2);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/servers/:episodeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const episodeId = String(request.params.episodeId);
    if (!episodeId) {
      return reply.status(400).send({
        error: "Missing required path parameter: 'episodeId'.",
      });
    }
    const cacheKey = `kaido-servers-${episodeId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await zoro.fetchServers(episodeId);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 6);
    }

    return reply.status(200).send(result);
  });

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 's-maxage=900, stale-while-revalidate=60');

      const episodeId = String(request.params.episodeId);
      const category = (request.query.category as 'sub' | 'dub' | 'raw') || 'sub';
      const server = (request.query.server as 'vidstreaming' | 'vidcloud') || 'vidcloud';

      if (!episodeId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'episodeId'.",
        });
      }
      if (!['sub', 'dub', 'raw'].includes(category)) {
        return reply.status(400).send({
          error: `Invalid category picked: '${category}'. Expected one of 'sub','dub' or 'raw'.`,
        });
      }
      if (!['vidstreaming', 'vidcloud'].includes(server)) {
        return reply.status(400).send({
          error: `Invalid  streaming server selected: '${server}'. Expected one of 'vidcloud' or 'vidstreaming'.`,
        });
      }
      const result = await zoro.fetchSources(episodeId, 'vidcloud', category);

      if ('error' in result) {
        return reply.status(500).send(result);
      }
      return reply.status(200).send(result);
    },
  );
}
