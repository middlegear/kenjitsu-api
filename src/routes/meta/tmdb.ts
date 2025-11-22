import { TheMovieDatabase } from '@middlegear/kenjitsu-extensions';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { FastifyParams, FastifyQuery } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const tmdb = new TheMovieDatabase();

export default async function TheMovieDatabaseRoutes(fastify: FastifyInstance) {
  fastify.get('/movies/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const { q, page = 1 } = request.query;

    if (!q) return reply.status(400).send({ error: "Missing required query param: 'q'" });
    if (q.length > 1000) return reply.status(400).send({ error: 'Query string too long' });
    const cacheKey = `tmdb-search-movie-${q}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) return reply.status(200).send(cachedData);

    try {
      const result = await tmdb.searchMovie(q, page);
      if (!result || typeof result !== 'object') {
        request.log.warn({ q, page, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, q, page }, `External API Error: Failed to fetch search results`);
        return reply.status(500).send(result);
      }
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 168);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while querying search results`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/tv/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);
    const { q, page = 1 } = request.query;

    if (!q) return reply.status(400).send({ error: "Missing required query param: 'q'" });
    if (q.length > 1000) return reply.status(400).send({ error: 'Query string too long' });
    const cacheKey = `tmdb-search-tv-${q}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) return reply.status(200).send(cachedData);
    try {
      const result = await tmdb.searchShows(q, page);

      if (!result || typeof result !== 'object') {
        request.log.warn({ q, page, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, q, page }, `External API Error: Failed to fetch search results`);
        return reply.status(500).send(result);
      }
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 168);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while querying search results`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get(
    '/movies/category/:category',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `public, s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const page = request.query.page || 1;
      const category = request.params.category as 'popular' | 'top-rated' | 'releasing';

      if (!category) {
        return reply.status(400).send({
          error: `Missing required path parameter: 'category'.`,
        });
      }

      if (category !== 'popular' && category !== 'top-rated' && category !== 'releasing') {
        return reply
          .status(400)
          .send({ error: `Invalid category: '${category}'. Expected 'popular' , 'top-rated' or 'releasing' ` });
      }

      const cacheKey = `tmdb-${category}-movie-${page}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) return reply.status(200).send(cachedData);

      try {
        let result;

        switch (category) {
          case 'popular':
            result = await tmdb.fetchPopularMovies(page);
            break;

          case 'top-rated':
            result = await tmdb.fetchTopMovies(page);
            break;

          case 'releasing':
            result = await tmdb.fetchReleasingMovies(page);
            break;
        }
        if (!result || typeof result !== 'object') {
          request.log.warn({ category, page, result }, 'External provider returned null/undefined');
          return reply.status(502).send({
            error: 'External provider returned an invalid response(null)',
          });
        }
        if ('error' in result) {
          request.log.error({ result, page, category }, `External API Error: Failed to fetch ${category} movies`);
          return reply.status(500).send(result);
        }

        if (result && Array.isArray(result.data) && result.data.length > 0) {
          let duration;
          category === 'releasing' ? (duration = 72) : (duration = 720);
          await redisSetCache(cacheKey, result, duration);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error, page, category }, `Internal runtime error occurred while fetching ${category} movies`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get(
    '/tv/category/:category',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `public, s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const page = request.query.page || 1;
      const category = request.params.category as 'popular' | 'top-rated' | 'airing';

      if (!category) {
        return reply.status(400).send({
          error: `Missing required path parameter: 'category'.`,
        });
      }

      if (category !== 'popular' && category !== 'top-rated' && category !== 'airing') {
        return reply
          .status(400)
          .send({ error: `Invalid category: '${category}'. Expected 'popular' , 'top-rated' or 'airing'` });
      }
      const cacheKey = `tmdb-${category}-tv-${page}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) return reply.status(200).send(cachedData);

      try {
        let result;
        switch (category) {
          case 'popular':
            result = await tmdb.fetchPopularTv(page);
            break;

          case 'top-rated':
            result = await tmdb.fetchTopShows(page);
            break;

          case 'airing':
            result = await tmdb.fetchAiringTv(page);
            break;
        }
        if (!result || typeof result !== 'object') {
          request.log.warn({ category, page, result }, 'External provider returned null/undefined');
          return reply.status(502).send({
            error: 'External provider returned an invalid response(null)',
          });
        }
        if ('error' in result) {
          request.log.error({ result, page, category }, `External API Error: Failed to fetch ${category} tv`);
          return reply.status(500).send(result);
        }

        if (result && Array.isArray(result.data) && result.data.length > 0) {
          let duration;
          category === 'airing' ? (duration = 24) : (duration = 720);
          await redisSetCache(cacheKey, result, duration);
        }
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error, page, category }, `Internal runtime error occurred while fetching ${category} tv`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get('/movies/:id', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const id = request.params.id;

    if (!id) {
      return reply.status(400).send({ error: 'Missing required path parameter: id' });
    }

    const cacheKey = `tmdb-media-info-movie-${id}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) return reply.status(200).send(cachedData);

    try {
      const result = await tmdb.fetchMovieInfo(Number(id));
      if (!result || typeof result !== 'object') {
        request.log.warn({ id, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch media info`);
        return reply.status(500).send(result);
      }
      if (result && result.data !== null) {
        await redisSetCache(cacheKey, result, 168);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while fetching media info`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/tv/:id', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const id = request.params.id;

    if (!id) {
      return reply.status(400).send({ error: 'Missing required path parameter: id' });
    }

    const cacheKey = `tmdb-media-info-tv-${id}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) return reply.status(200).send(cachedData);

    try {
      const result = await tmdb.fetchShowInfo(Number(id));
      if (!result || typeof result !== 'object') {
        request.log.warn({ id, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch media info`);
        return reply.status(500).send(result);
      }
      if (result && result.data !== null) {
        await redisSetCache(cacheKey, result, 168);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while fetching media info`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });
  fastify.get('/movies/:id/mappings', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const id = request.params.id;

    if (!id) {
      return reply.status(400).send({ error: 'Missing required path parameter: id' });
    }

    const cacheKey = `tmdb-provider-id-movie-${id}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) return reply.status(200).send(cachedData);

    try {
      const result = await tmdb.fetchMovieProviderId(Number(id));
      if (!result || typeof result !== 'object') {
        request.log.warn({ id, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch provider info`);
        return reply.status(500).send(result);
      }

      if (result && result.data !== null && result.provider !== null) {
        await redisSetCache(cacheKey, result, 336);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while fetching provider info`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/tv/:id/mappings', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const id = request.params.id;

    if (!id) {
      return reply.status(400).send({ error: 'Missing required path parameter: id' });
    }

    const cacheKey = `tmdb-provider-id-tv-${id}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) return reply.status(200).send(cachedData);

    try {
      const result = await tmdb.fetchTvProviderId(Number(id));
      if (!result || typeof result !== 'object') {
        request.log.warn({ id, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch provider info`);
        return reply.status(500).send(result);
      }

      if (result && result.data !== null && result.provider !== null) {
        await redisSetCache(cacheKey, result, 336);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while fetching provider info`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/movies/trending', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const page = request.query.page || 1;
    const timeWindow = request.query.timeWindow || 'week';

    if (timeWindow !== 'week' && timeWindow !== 'day') {
      return reply.status(400).send({ error: `Invalid timeWindow: '${timeWindow}'. Expected 'day' or 'week'` });
    }
    const duration = timeWindow === 'week' ? 168 : 24;
    const cacheKey = `tmdb-trending-movie-${page}`;

    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) return reply.status(200).send(cachedData);

    try {
      const result = await tmdb.fetchTrendingMovies(timeWindow, page);
      if (!result || typeof result !== 'object') {
        request.log.warn({ timeWindow, page, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, page, timeWindow }, `External API Error: Failed to fetch trending media`);
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, duration);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while fetching trending media`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/tv/trending', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const page = request.query.page || 1;
    const timeWindow = request.query.timeWindow || 'week';

    if (timeWindow !== 'week' && timeWindow !== 'day') {
      return reply.status(400).send({ error: `Invalid timeWindow: '${timeWindow}'. Expected 'day' or 'week'` });
    }
    const duration = timeWindow === 'week' ? 168 : 24;
    const cacheKey = `tmdb-trending-tv-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) return reply.status(200).send(cachedData);

    try {
      const result = await tmdb.fetchTrendingTv(timeWindow, page);
      if (!result || typeof result !== 'object') {
        request.log.warn({ timeWindow, page, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, page, timeWindow }, `External API Error: Failed to fetch trending media`);
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, duration);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while fetching trending media`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/tv/:id/seasons/:season', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    const id = request.params.id;
    const season = request.params.season;

    if (!id) {
      return reply.status(400).send({ error: 'Missing required path parameter: id' });
    }
    if (!season) {
      return reply.status(400).send({ error: 'Missing required path parameter: season' });
    }

    const cacheKey = `tmdb-episodes-tv-${id}-${season}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) return reply.status(200).send(cachedData);

    try {
      const result = await tmdb.fetchTvEpisodes(Number(id), Number(season));
      if (!result || typeof result !== 'object') {
        request.log.warn({ id, season, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, id, season }, `External API Error: Failed to fetch seasonal tv episodes`);
        return reply.status(500).send(result);
      }
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 168);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while fetching seasonal tv episodes`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get(
    '/tv/:id/seasons/:season/episodes/:episode',
    async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `public, s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const id = request.params.id;
      const season = request.params.season;
      const episode = request.params.episode;

      if (!id) {
        return reply.status(400).send({ error: 'Missing required path parameter: id' });
      }

      if (!episode) {
        return reply.status(400).send({ error: 'Missing required path parameter: episode' });
      }

      if (!season) {
        return reply.status(400).send({ error: 'Missing required path parameter: season' });
      }

      const cacheKey = `tmdb-episode-${id}-${season}-${episode}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) return reply.status(200).send(cachedData);

      try {
        const result = await tmdb.fetchEpisodeInfo(Number(id), Number(season), Number(episode));
        if (!result || typeof result !== 'object') {
          request.log.warn({ id, season, episode, result }, 'External provider returned null/undefined');
          return reply.status(502).send({
            error: 'External provider returned an invalid response(null)',
          });
        }
        if ('error' in result) {
          request.log.error({ result, id, season, episode }, `External API Error: Failed to fetch tv episodeInfo`);
          return reply.status(500).send(result);
        }
        if (result && result.data !== null) {
          await redisSetCache(cacheKey, result, 720);
        }
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error }, `Internal runtime error occurred while fetching tv episodeInfo`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get('/movies/:id/sources', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=60');

    const id = request.params.id;

    if (!id) {
      return reply.status(400).send({ error: 'Missing required path parameter: id' });
    }

    try {
      const result = await tmdb.fetchMovieSources(Number(id));
      if (!result || typeof result !== 'object') {
        request.log.warn({ id, result }, 'External provider returned null/undefined');
        return reply.status(502).send({
          error: 'External provider returned an invalid response(null)',
        });
      }
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch sources`);
        return reply.status(500).send(result);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error }, `Internal runtime error occurred while fetching sources`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get(
    '/tv/:id/seasons/:season/episodes/:episode/sources',
    async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=60');

      const id = request.params.id;
      const season = request.params.season;
      const episode = request.params.episode;

      if (!id) {
        return reply.status(400).send({ error: 'Missing required path parameter: id' });
      }

      if (!episode) {
        return reply.status(400).send({ error: 'Missing required path parameter: episode' });
      }

      if (!season) {
        return reply.status(400).send({ error: 'Missing required path parameter: season' });
      }

      try {
        const result = await tmdb.fetchTvSources(Number(id), Number(season), Number(episode));
        if (!result || typeof result !== 'object') {
          request.log.warn({ id, result }, 'External provider returned null/undefined');
          return reply.status(502).send({
            error: 'External provider returned an invalid response(null)',
          });
        }
        if ('error' in result) {
          request.log.error({ result, id, season, episode }, `External API Error: Failed to fetch sources`);
          return reply.status(500).send(result);
        }
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error }, `Internal runtime error occurred while fetching sources`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );
}
