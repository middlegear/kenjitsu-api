import { Animekai, type IAnimeCategory, type IMetaFormat } from '@middlegear/kenjitsu-extensions';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IAMetaFormatArr, IAnimeCategoryArr, type FastifyParams, type FastifyQuery } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const animekai = new Animekai('https://animekai.to');

export default async function AnimekaiRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');

    const result = await animekai.fetchHome();

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

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

    const page = Number(request.query.page) || 1;

    try {
      const result = await animekai.search(q, page);
      if ('error' in result) {
        request.log.error({ result, q, page }, `External API Error: Failed to fetch search results for query:${q}`);
        return reply.status(500).send(result);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occured while querying search results`);
      return reply.status(500).send({ error: `Internal server error occured: ${error}` });
    }
  });

  fastify.get('/recently-updated', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const page = request.query.page || 1;
    const category = (request.query.format as IMetaFormat) || 'TV';

    if (!IAMetaFormatArr.includes(category)) {
      return reply.status(400).send({
        error: `Invalid format: '${category}'. Expected one of ${IAMetaFormatArr.join(', ')}.`,
      });
    }

    try {
      const result = await animekai.fetchRecentlyUpdated(category, page);

      if ('error' in result) {
        request.log.error({ result, category, page }, `External API Error: Failed to fetch recently updated anime`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occured while fetching recently updated anime`);
      return reply.status(500).send({ error: `Internal server error occured: ${error}` });
    }
  });

  fastify.get('/recently-added', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const format = (request.query.format as IMetaFormat) || 'TV';
    const page = request.query.page || 1;

    if (!IAMetaFormatArr.includes(format)) {
      return reply.status(400).send({
        error: `Invalid format: '${format}'. Expected one of ${IAMetaFormatArr.join(', ')}.`,
      });
    }

    try {
      const result = await animekai.fetchRecentlyAdded(format, page);

      if ('error' in result) {
        request.log.error({ result, format, page }, `External API Error: Failed to fetch recently added anime`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occured while fetching recently added anime`);
      return reply.status(500).send({ error: `Internal server error occured: ${error}` });
    }
  });

  fastify.get('/recently-completed', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const format = (request.query.format as IMetaFormat) || 'TV';
    const page = request.query.page || 1;

    if (!IAMetaFormatArr.includes(format)) {
      return reply.status(400).send({
        error: `Invalid format: '${format}'. Expected one of ${IAMetaFormatArr.join(', ')}.`,
      });
    }

    try {
      const result = await animekai.fetchRecentlyCompleted(format, page);

      if ('error' in result) {
        request.log.error({ result, format, page }, `External API Error: Failed to fetch recently completed anime`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occured while fetching recently completed anime`);
      return reply.status(500).send({ error: `Internal server error occured: ${error}` });
    }
  });

  fastify.get('/category', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    //
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    const format = (request.query.format as IAnimeCategory) || 'TV';

    if (!IAnimeCategoryArr.includes(format)) {
      return reply.status(400).send({
        error: `Invalid format: '${format}'. Expected one of ${IAnimeCategoryArr.join(', ')}.`,
      });
    }

    try {
      const result = await animekai.fetchAnimeCategory(format, page);

      if ('error' in result) {
        request.log.error({ result, format, page }, `External API Error: Failed to fetch anime of format:${format}`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, 'Internal runtime error occured while fetching anime category');
      return reply.status(500).send({ error: `Internal server error occured: ${error}` });
    }
  });

  fastify.get('/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    //
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const format = (request.query.format as IMetaFormat) || 'TV';
    const page = request.query.page || 1;

    if (!IAMetaFormatArr.includes(format)) {
      return reply.status(400).send({
        error: `Invalid format: '${format}'. Expected one of ${IAMetaFormatArr.join(', ')}.`,
      });
    }

    try {
      const result = await animekai.fetchTopAiring(format, page);
      if ('error' in result) {
        request.log.error({ result, format, page }, `External API Error: Failed to fetch top airing anime:${format}`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, 'Internal runtime occurred processing top-airing');
      return reply.status(500).send({ error: `Internal server error occured: ${error}` });
    }
  });

  fastify.get(
    '/genre/:genre',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const page = Number(request.query.page) || 1;
      const genre = request.params.genre;

      if (!genre) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'genre'.",
        });
      }
      try {
        const result = await animekai.fetchGenres(genre, page);

        if ('error' in result) {
          request.log.error({ result }, `External API Error: Failed to fetch genre:${genre}`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, 'Internal runtime error occurred processing genres');
        return reply.status(500).send({ error: `Internal server error occured: ${error}` });
      }
    },
  );

  fastify.get('/info/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    let duration;
    const animeId = String(request.params.animeId);

    if (!animeId) {
      return reply.status(400).send({
        error: "Missing required path parameter: 'animeId'.",
      });
    }
    const cacheKey = `animekai-animeinfo-${animeId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }
    try {
      const result = await animekai.fetchAnimeInfo(animeId);

      if ('error' in result) {
        request.log.error({ result, animeId }, `External API Error: Failed to fetch info for: ${animeId} `);
        return reply.status(500).send(result);
      }
      if (
        result.data !== null &&
        Array.isArray(result.providerEpisodes) &&
        result.providerEpisodes.length > 0 &&
        result.data.type?.toLowerCase() !== 'movie'
      ) {
        result.data.status?.toLowerCase() === 'completed' ? (duration = 0) : (duration = 1);

        await redisSetCache(cacheKey, result, duration);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, 'Internal runtime error processing animeinfo');
      return reply.status(500).send({ error: `Internal server error occured: ${error}` });
    }
  });

  fastify.get(
    '/servers/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 's-maxage=420, stale-while-revalidate=180');

      const episodeId = String(request.params.episodeId);
      const category = (request.query.category as 'sub' | 'dub' | 'raw') || 'sub';
      const server = (request.query.server as 'server-1' | 'server-2') || 'server-1';

      if (!episodeId) {
        return reply.status(400).send({ error: 'Missing required params: episodeId' });
      }

      if (!['server-1', 'server-2'].includes(server)) {
        return reply.status(400).send({
          error: `Invalid  streaming server selected: '${server}'. Expected one of 'server-1' or 'server-2'.`,
        });
      }

      if (!['sub', 'dub', 'raw'].includes(category)) {
        return reply.status(400).send({
          error: `Invalid category: '${category}'. Expected one of 'sub','dub' or 'raw'.`,
        });
      }
      try {
        const result = await animekai.fetchServers(episodeId, category, server);

        if ('error' in result) {
          request.log.error(
            { result, server, category, episodeId },
            `External API Error: Failed to fetch servers for episode ${episodeId}`,
          );
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error fetching servers for episode ${episodeId}`);
        return reply.status(500).send({ error: `Internal server error occured: ${error}` });
      }
    },
  );

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 's-maxage=600, stale-while-revalidate=180');

      const episodeId = String(request.params.episodeId);
      const category = (request.query.category as 'sub' | 'dub' | 'raw') || 'sub';
      const server = (request.query.server as 'server-1' | 'server-2') || 'server-1';

      if (!episodeId) {
        return reply.status(400).send({ error: 'Missing required params: episodeId' });
      }

      if (!['server-1', 'server-2'].includes(server)) {
        return reply.status(400).send({
          error: `Invalid  streaming server selected: '${server}'. Expected one of 'server-1' or 'server-2'.`,
        });
      }
      try {
        const result = await animekai.fetchSources(episodeId, category, server);

        if ('error' in result) {
          request.log.error(
            { result, server, episodeId, category },
            `External API Error: Failed to fetch sources for episode ${episodeId}`,
          );
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error fetching sources for episode ${episodeId}`);
        return reply.status(500).send({ error: `Internal server error occured: ${error}` });
      }
    },
  );
}
