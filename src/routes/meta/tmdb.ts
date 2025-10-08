import { TheMovieDatabase } from '@middlegear/hakai-extensions';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { FastifyParams, FastifyQuery } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const tmdb = new TheMovieDatabase();

export default async function TheMovieDatabaseRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Welcome to The TheMovieDatabase provider' });
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const q = String(request.query.q);
    const page = Number(request.query.page) || 1;
    const type = request.query.type as 'movie' | 'tv';

    if (!q.length) {
      return reply.status(400).send({ error: "Missing required query params: 'q' " });
    }
    if (q.length > 1000) {
      return reply.status(400).send({ error: 'query string too long' });
    }

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

    let result;
    type === 'movie' ? (result = await tmdb.searchMovie(q, page)) : (result = await tmdb.searchShows(q, page));

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get(
    '/info/:mediaId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

      const mediaId = Number(request.params.mediaId);
      const type = request.query.type as 'movie' | 'tv';

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
      const cacheKey = `tmdb-media-info-${mediaId}-${type}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }
      let result;
      type === 'movie' ? (result = await tmdb.fetchMovieInfo(mediaId)) : (result = await tmdb.fetchShowInfo(mediaId));

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && result.data !== null) {
        await redisSetCache(cacheKey, result, 168);
      }
      if (result) return reply.status(200).send(result);
    },
  );

  fastify.get('/trending', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const type = request.query.type as 'movie' | 'tv';
    const page = Number(request.query.page) || 1;
    const timeWindow = (request.query.timeWindow as 'day' | 'week') || 'week';

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
    if (timeWindow !== 'week' && timeWindow !== 'day') {
      return reply.status(400).send({
        error: `Invalid timeWindow: '${timeWindow}'. Expected 'day' or 'week'.`,
      });
    }

    let duration;
    timeWindow === 'week' ? (duration = 168) : (duration = 24);

    const cacheKey = ` tmdb-trending-${type}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    let result;
    type === 'movie'
      ? (result = await tmdb.fetchTrendingMovies(timeWindow, page))
      : (result = await tmdb.fetchTrendingTv(timeWindow, page));

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, duration);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const type = request.query.type as 'movie' | 'tv';
    const page = Number(request.query.page) || 1;

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
    const cacheKey = ` tmdb-popular-${type}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    let result;
    type === 'movie' ? (result = await tmdb.fetchPopularMovies(page)) : (result = await tmdb.fetchPopularTv(page));

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/top', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const type = request.query.type as 'movie' | 'tv';
    const page = Number(request.query.page) || 1;

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
    const cacheKey = `tmdb-popular-${type}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    let result;
    type === 'movie' ? (result = await tmdb.fetchTopMovies(page)) : (result = await tmdb.fetchTopShows(page));

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get(
    '/get-provider/:tmdbId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const type = request.query.type as 'movie' | 'tv';
      const tmdbId = request.params.tmdbId;
      if (!tmdbId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'tmdbId'.",
        });
      }
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
      const cacheKey = ` tmdb-provider-id-${type}-${tmdbId}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }
      let result;
      type === 'movie'
        ? (result = await tmdb.fetchMovieProviderId(tmdbId))
        : (result = await tmdb.fetchTvProviderId(tmdbId));

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && result.data !== null && result.provider !== null) {
        await redisSetCache(cacheKey, result, 168);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get('/airing-tv', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const cacheKey = ` tmdb-airing-tv-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await tmdb.fetchAiringTv(page);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get(
    '/episodes/:tmdbId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

      const tmdbId = Number(request.params.tmdbId);
      const season = Number(request.query.season);
      if (!tmdbId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'tmdbId'.",
        });
      }
      if (!season) {
        return reply.status(400).send({
          error: "Missing required query parameter: 'season'.",
        });
      }
      const cacheKey = ` tmdb-episodes-tv-${tmdbId}-${season}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await tmdb.fetchTvEpisodes(tmdbId, season);

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 24);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    '/episode-info/:tmdbId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const tmdbId = Number(request.params.tmdbId);
      const season = Number(request.query.season);
      const episodeNumber = Number(request.query.episode);

      if (!episodeNumber) {
        return reply.status(400).send({
          error: "Missing required query parameter: 'episode'.",
        });
      }
      if (!tmdbId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'tmdbId'.",
        });
      }
      if (!season) {
        return reply.status(400).send({
          error: "Missing required query parameter: 'season'.",
        });
      }

      const cacheKey = `tmdb-episode-info-${tmdbId}-${season}-${episodeNumber}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await tmdb.fetchEpisodeInfo(tmdbId, season, episodeNumber);
      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && result.data !== null) {
        await redisSetCache(cacheKey, result, 0);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get('/releasing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${48 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const cacheKey = `tmdb-releasing-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await tmdb.fetchReleasingMovies(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/upcoming', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const cacheKey = `tmdb-upcoming-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }
    const result = await tmdb.fetchUpcomingMovies(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }
    return reply.status(200).send(result);
  });

  fastify.get(
    '/watch/:tmdbId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 's-maxage=600, stale-while-revalidate=60');

      const tmdbId = Number(request.params.tmdbId);
      const seasonNumber = Number(request.query.season);
      const episodeNumber = Number(request.query.episode);

      let result;
      seasonNumber && episodeNumber
        ? (result = await tmdb.fetchTvSources(tmdbId, seasonNumber, episodeNumber))
        : (result = await tmdb.fetchMovieSources(tmdbId));

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    },
  );
}
