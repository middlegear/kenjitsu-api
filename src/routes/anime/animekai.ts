import { Animekai, type IAnimeCategory, type IMetaFormat } from '@middlegear/kenjitsu-extensions';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IAMetaFormatArr, IAnimeCategoryArr, type FastifyParams, type FastifyQuery } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const animekai = new Animekai('https://animekai.to');

export default async function AnimekaiRoutes(fastify: FastifyInstance) {
  fastify.get('/home', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');

    try {
      const result = await animekai.fetchHome();

      if ('error' in result) {
        request.log.error({ result }, `External API Error: Failed to fetch home results`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred `);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/anime/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300');

    const { q, page = 1 } = request.query;
    if (!q) return reply.status(400).send({ error: "Missing required query parameter: 'q'" });
    if (q.length > 1000) return reply.status(400).send({ error: 'Query string too long' });

    try {
      const result = await animekai.search(q, page);
      if ('error' in result) {
        request.log.error({ result, q, page }, `External API Error: Failed to fetch search results.`);
        return reply.status(500).send(result);
      }
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred while querying search results`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get(
    '/anime/recent/:status',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

      const page = request.query.page || 1;
      const status = request.params.status as 'completed' | 'added' | 'updated';
      const format = (request.query.format as IMetaFormat) || 'TV';

      if (!IAMetaFormatArr.includes(format)) {
        return reply.status(400).send({
          error: `Invalid format: '${format}'. Expected one of ${IAMetaFormatArr.join(', ')}.`,
        });
      }
      if (status !== 'completed' && status !== 'added' && status !== 'updated') {
        return reply
          .status(400)
          .send({ error: `Invalid path parameter status: '${status}'. Expected ''completed' , 'added' or 'updated'.` });
      }
      const cacheKey = `animekai-recent-${status}-{-${page}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      try {
        let result;
        switch (status) {
          case 'completed':
            result = await animekai.fetchRecentlyCompleted(format, page);
            break;
          case 'added':
            result = await animekai.fetchRecentlyAdded(format, page);
            break;
          case 'updated':
            result = await animekai.fetchRecentlyUpdated(format, page);
            break;
        }

        if ('error' in result) {
          request.log.error({ result, page, status, format }, `External API Error: Failed to fetch recent anime`);
          return reply.status(500).send(result);
        }
        if (result && Array.isArray(result.data) && result.data.length > 0) {
          await redisSetCache(cacheKey, result, 2);
        }
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching recent anime`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get(
    '/anime/format/:format',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

      const page = Number(request.query.page) || 1;
      const format = request.params.format as IAnimeCategory;

      if (!IAnimeCategoryArr.includes(format)) {
        return reply.status(400).send({
          error: `Invalid format: '${format}'. Expected one of ${IAnimeCategoryArr.join(', ')}.`,
        });
      }
      if (!format) {
        return reply.status(400).send({ error: 'Missing required path paramater: format' });
      }
      try {
        const result = await animekai.fetchAnimeCategory(format, page);

        if ('error' in result) {
          request.log.error({ result, format, page }, `External API Error: Failed to fetch anime format`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, 'Internal runtime error occurred while fetching anime format');
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get('/anime/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
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
        request.log.error({ result, format, page }, `External API Error: Failed to fetch top airing anime`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, 'Internal runtime occurred processing top-airing');
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get(
    '/anime/genre/:genre',
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
          request.log.error({ result }, `External API Error: Failed to fetch genre`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, 'Internal runtime error occurred while fetching genres');
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get('/anime/:id', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    let duration;
    const id = request.params.id;

    if (!id) {
      return reply.status(400).send({
        error: "Missing required path parameter: 'id'.",
      });
    }
    const cacheKey = `animekai-animeinfo-${id}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }
    try {
      const result = await animekai.fetchAnimeInfo(id);

      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch info`);
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
      request.log.error({ error: error }, 'Internal runtime error occurred fetching animeinfo');
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get(
    '/episode/:episodeId/servers',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 's-maxage=420, stale-while-revalidate=180');

      const episodeId = String(request.params.episodeId);

      if (!episodeId) {
        return reply.status(400).send({ error: 'Missing required params: episodeId' });
      }

      try {
        const result = await animekai.fetchServers(episodeId);

        if ('error' in result) {
          request.log.error({ result, episodeId }, `External API Error: Failed to fetch server info`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching server info}`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );
  fastify.get(
    '/episode/:episodeId/embed-servers',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 's-maxage=420, stale-while-revalidate=180');

      const episodeId = String(request.params.episodeId);
      const version = (request.query.version as 'sub' | 'dub' | 'raw') || 'sub';
      const server = (request.query.server as 'server-1' | 'server-2') || 'server-1';

      if (!episodeId) {
        return reply.status(400).send({ error: 'Missing required params: episodeId' });
      }

      if (!['server-1', 'server-2'].includes(server)) {
        return reply.status(400).send({
          error: `Invalid  streaming server selected: '${server}'. Expected one of 'server-1' or 'server-2'.`,
        });
      }

      if (!['sub', 'dub', 'raw'].includes(version)) {
        return reply.status(400).send({
          error: `Invalid version: '${version}'. Expected one of 'sub','dub' or 'raw'.`,
        });
      }
      try {
        const result = await animekai.fetchEmbedServers(episodeId, version, server);

        if ('error' in result) {
          request.log.error({ result, server, version, episodeId }, `External API Error: Failed to fetch embed servers`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching embed servers}`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );
  fastify.get(
    '/sources/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 's-maxage=600, stale-while-revalidate=180');

      const episodeId = String(request.params.episodeId);
      const version = (request.query.version as 'sub' | 'dub' | 'raw') || 'sub';
      const server = (request.query.server as 'server-1' | 'server-2') || 'server-1';

      if (!episodeId) {
        return reply.status(400).send({ error: 'Missing required params: episodeId' });
      }
      if (!['sub', 'dub', 'raw'].includes(version)) {
        return reply.status(400).send({
          error: `Invalid version picked: '${version}'. Expected one of 'sub','dub','raw'.`,
        });
      }
      if (!['server-1', 'server-2'].includes(server)) {
        return reply.status(400).send({
          error: `Invalid  streaming server selected: '${server}'. Expected one of 'server-1' or 'server-2'.`,
        });
      }
      try {
        const result = await animekai.fetchSources(episodeId, version, server);

        if ('error' in result) {
          request.log.error({ result, server, episodeId, version }, `External API Error: Failed to fetch sources.`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occured while fetching sources.`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );
}
