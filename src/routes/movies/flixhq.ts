import { FlixHQ, type IMovieGenre, type IMovieCountry } from '@middlegear/hakai-extensions';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyParams, FastifyQuery } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const flixhq = new FlixHQ();

export default async function FlixHQRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `flix-home`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await flixhq.fetchHome();

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.upcoming) && result.upcoming.length > 0) {
      await redisSetCache(cacheKey, result, 48);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');

    if (!q.length) {
      return reply.status(400).send({ error: "Missing required query params: 'q' " });
    }
    if (q.length > 1000) {
      return reply.status(400).send({ error: 'query string  too long' });
    }

    const page = Number(request.query.page) || 1;
    const result = await flixhq.search(q, page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/suggestions', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');

    if (!q.length) {
      return reply.status(400).send({ error: "Missing required query params: 'q' " });
    }
    if (q.length > 1000) {
      return reply.status(400).send({ error: 'query string too long' });
    }

    const result = await flixhq.searchSuggestions(q);

    if ('error' in result) {
      return reply.status(500).send(result);
    }
    return reply.status(200).send(result);
  });

  fastify.get(
    '/advanced-search',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

      const genre = request.query.genre as IMovieGenre | 'all' | undefined;
      const country = request.query.country as IMovieCountry | undefined;
      const type = (request.query.type as 'movie' | 'tv' | 'all') || 'all';
      const quality = (request.query.quality as 'all' | 'HD' | 'SD' | 'CAM') || 'all';
      const page = Number(request.query.page) || 1;

      const validTypes = ['movie', 'tv', 'all'] as const;
      if (!validTypes.includes(type)) {
        return reply.status(400).send({
          error: `Invalid type: '${type}'. Expected one of ${validTypes.join(', ')}.`,
        });
      }

      const validQualities = ['all', 'SD', 'HD', 'CAM'] as const;
      if (!validQualities.includes(quality)) {
        return reply.status(400).send({
          error: `Invalid quality: '${quality}'. Expected one of ${validQualities.join(', ')}.`,
        });
      }

      const selectedCountry = country || 'all';

      const cacheKey = `flix-advanced-search-${type}-${quality}-${genre}-${selectedCountry}-${page}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await flixhq.advancedSearch(type, quality, genre, selectedCountry, page);

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 720);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    '/info/:mediaId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${72 * 60 * 60}, stale-while-revalidate=300`);

      const mediaId = request.params.mediaId;

      if (!mediaId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'mediaId'.",
        });
      }
      const cacheKey = `flix-media-info-${mediaId}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await flixhq.fetchMediaInfo(mediaId);

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && result.data !== null && Array.isArray(result.providerEpisodes) && result.providerEpisodes.length > 1) {
        await redisSetCache(cacheKey, result, 168);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get('/popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const type = request.query.type as 'movie' | 'tv';
    const page = request.query.page || 1;

    if (!type) {
      return reply.status(400).send({
        error: "Missing required query parameter: 'type'.",
      });
    }

    if (type !== 'movie' && type !== 'tv') {
      return reply.status(400).send({
        error: `Invalid type: '${type}'. Expected 'movie' or 'tv'.`,
      });
    }

    const cacheKey = `flix-popular-${type}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    let result;
    type === 'movie' ? (result = await flixhq.fetchPopularMovies(page)) : (result = await flixhq.fetchPopularTv(page));

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 336);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/top', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const type = request.query.type as 'movie' | 'tv';
    const page = request.query.page || 1;
    if (!type) {
      return reply.status(400).send({
        error: "Missing required query parameter: 'type'.",
      });
    }
    if (type !== 'movie' && type !== 'tv') {
      return reply.status(400).send({
        error: `Invalid type: '${type}'. Expected 'movie' or 'tv'.`,
      });
    }
    const cacheKey = `flix-top-${type}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    let result;
    type === 'movie' ? (result = await flixhq.fetchTopMovies(page)) : (result = await flixhq.fetchTopTv(page));

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 336);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/upcoming', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const page = request.query.page || 1;

    const cacheKey = `flix-upcoming-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await flixhq.fetchUpcoming(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 148);
    }
    return reply.status(200).send(result);
  });

  fastify.get(
    '/genre/:genre',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const genre = request.params.genre as IMovieGenre | undefined;
      const page = request.query.page || 1;

      if (!genre) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'genre'.",
        });
      }

      const cacheKey = `flix-genre-${genre}-${page}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await flixhq.fetchGenre(genre, page);

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 336);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    '/country/:country',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const page = request.query.page || 1;
      const country = request.params.country as IMovieCountry;

      if (!country) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'country'.",
        });
      }
      const cacheKey = `flix-country-${country}-${page}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await flixhq.fetchByCountry(country, page);

      if ('error' in result) {
        return reply.status(500).send(result);
      }
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 336);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    '/servers/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const episodeId = request.params.episodeId;
      if (!episodeId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'episodeId'.",
        });
      }
      const cacheKey = `flix-servers-${episodeId}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }
      const result = await flixhq.fetchServers(episodeId);

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 148);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=1200, stale-while-revalidate=300`);

      const episodeId = request.params.episodeId;
      const server = (request.query.server as 'vidcloud' | 'akcloud' | 'upcloud') || 'vidcloud';
      if (!episodeId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'episodeId'.",
        });
      }
      const validServers = ['vidcloud', 'akcloud', 'upcloud'] as const;
      if (!validServers.includes(server)) {
        return reply.status(400).send({
          error: `Invalid server: '${server}'. Expected one of ${validServers.join(', ')}.`,
        });
      }

      const result = await flixhq.fetchSources(episodeId, server);

      if ('error' in result) {
        return reply.status(500).send(result);
      }
      return reply.status(200).send(result);
    },
  );
}
