import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  Anilist,
  AllAnime,
  Anizone,
  Animepahe,
  HiAnime,
  type Seasons,
  type IMetaFormat,
  Kaido,
} from '@middlegear/kenjitsu-extensions';
import {
  allowedProviders,
  IAMetaFormatArr,
  IAnimeSeasonsArr,
  type FastifyParams,
  type FastifyQuery,
} from '../../utils/types.js';
import { redisSetCache, redisGetCache } from '../../middleware/cache.js';

const anilist = new Anilist();
const allanime = new AllAnime();
const anizone = new Anizone();
const hianime = new HiAnime();
const animepahe = new Animepahe();
const kaido = new Kaido();

export default async function AnilistRoutes(fastify: FastifyInstance) {
  fastify.get('/anime/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const { q, page = 1 } = request.query;
    if (!q) return reply.status(400).send({ error: "Missing required query parameter: 'q'" });
    if (q.length > 1000) return reply.status(400).send({ error: 'Query string too long' });

    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    try {
      const result = await anilist.search(q, page, perPage);
      if ('error' in result) {
        request.log.error({ result, q, page, perPage }, `External API Error: Failed to fetch search results`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred while querying search results`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/anime/:id', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    let duration;
    const id = Number(request.params.id);

    if (!id) {
      return reply.status(400).send({ error: 'Missing required path params: id' });
    }

    const cacheKey = `anilist-info-${id}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    try {
      const result = await anilist.fetchInfo(id);
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch animeinfo `);
        return reply.status(500).send(result);
      }

      if (result && result.data !== null) {
        result.data.status.toLowerCase() === 'finished' ? (duration = 0) : (duration = 24);
        await redisSetCache(cacheKey, result, duration);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred while fetching animeinfo`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get(
    '/anime/top/:category',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `public, s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

      const page = Number(request.query.page) || 1;
      let perPage = Number(request.query.perPage) || 20;
      perPage = Math.min(perPage, 50);
      const category = request.params.category as 'airing' | 'trending' | 'upcoming' | 'popular' | 'rating';

      if (
        category !== 'airing' &&
        category !== 'trending' &&
        category !== 'upcoming' &&
        category !== 'rating' &&
        category !== 'popular'
      ) {
        return reply.status(400).send({
          error: `Invalid type: '${category}'. Expected 'airing' , 'upcoming' , 'trending', 'popular' or 'rating'.`,
        });
      }
      if (!category) {
        return reply.status(400).send({ error: `Missing required path parameter: category` });
      }

      const cacheKey = `anilist-top-${category}-${page}`;
      const cacheData = await redisGetCache(cacheKey);
      if (cacheData) {
        return reply.status(200).send(cacheData);
      }

      try {
        let result;

        switch (category) {
          case 'airing':
            result = await anilist.fetchTopAiring(page, perPage);
            break;

          case 'trending':
            result = await anilist.fetchTrending(page, perPage);
            break;

          case 'upcoming':
            result = await anilist.fetchTopUpcoming(page, perPage);
            break;

          case 'rating':
            result = await anilist.fetchTopRatedAnime(page, perPage);
            break;

          case 'popular':
            result = await anilist.fetchMostPopular(page, perPage);
            break;
        }

        if ('error' in result) {
          request.log.error({ result, page, perPage }, `External API Error: Failed to fetch top animelist `);
          return reply.status(500).send(result);
        }

        let duration = category === 'airing' || category === 'trending' ? 24 : 168;

        if (result && Array.isArray(result.data) && result.data.length > 0) {
          await redisSetCache(cacheKey, result, duration);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching top animelist`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get('/anime/:id/characters', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const id = request.params.id;

    if (!id) {
      return reply.status(400).send({
        error: "Missing required path parameter: 'id'.",
      });
    }

    const cacheKey = `anilist-characters-${id}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    try {
      const result = await anilist.fetchCharacters(Number(id));
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch characters `);
        return reply.status(500).send(result);
      }

      if (result && result.data !== null) {
        await redisSetCache(cacheKey, result, 0);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred while fetching characters`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/anime/:id/related', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const id = request.params.id;

    if (!id) {
      return reply.status(400).send({
        error: "Missing required path parameter: 'id'.",
      });
    }
    const cacheKey = `anilist-related-${id}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    try {
      const result = await anilist.fetchRelatedAnime(Number(id));
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch related anime.`);
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 178);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred while fetching related anime`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  /// busted
  // fastify.get('/schedule/airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
  //   reply.header('Cache-Control', `public, s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

  //   const page = Number(request.query.page) || 1;
  //   const score = Number(request.query.score) || 60;

  //   const cacheKey = `anilist-schedule-${page}-${score}`;
  //   const cachedData = await redisGetCache(cacheKey);
  //   if (cachedData) {
  //     return reply.status(200).send(cachedData);
  //   }

  //   try {
  //     const result = await anilist.fetchAiringSchedule(page, score);
  //     if ('error' in result) {
  //       request.log.error({ result, page, score }, `External API Error: Failed to fetch airing schedule.`);
  //       return reply.status(500).send(result);
  //     }

  //     if (result && Array.isArray(result.data) && result.data.length > 0) {
  //       await redisSetCache(cacheKey, result, 6);
  //     }

  //     return reply.status(200).send(result);
  //   } catch (error) {
  //     request.log.error({ error: error }, `Internal runtime error occurred while fetching airing schedule`);
  //     return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
  //   }
  // });

  fastify.get('/schedule/:id', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    const id = request.params.id;

    if (!id) {
      return reply.status(400).send({
        error: "Missing required path parameter: 'id'.",
      });
    }
    const cacheKey = `anilist-media-schedule-${anilist}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    try {
      const result = await anilist.fetchMediaSchedule(Number(id));
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error: Failed to fetch media schedule.`);
        return reply.status(500).send(result);
      }

      if (result && result.data !== null) {
        await redisSetCache(cacheKey, result, 24);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred while fetching media schedule`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get(
    '/seasons/:season/:year',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `public, s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

      const season = request.params.season as Seasons;
      const year = Number(request.params.year);
      const format = (request.query.format as IMetaFormat) || 'TV';
      const page = Number(request.query.page) || 1;
      let perPage = Number(request.query.perPage) || 20;
      perPage = Math.min(perPage, 50);

      if (!IAMetaFormatArr.includes(format)) {
        return reply.status(400).send({
          error: `Invalid format: '${format}'. Expected one of ${IAMetaFormatArr.join(', ')}.`,
        });
      }

      if (!season) {
        return reply.status(400).send({
          error: "Missing required parameter parameter: 'season'.",
        });
      }

      if (!year) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'year'.",
        });
      }

      if (!IAnimeSeasonsArr.includes(season)) {
        return reply.status(400).send({
          error: `Invalid format: '${season}'. Expected one of ${IAnimeSeasonsArr.join(', ')}.`,
        });
      }

      const cacheKey = `anilist-season-${season}-${year}-${page}-${format}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      try {
        const result = await anilist.fetchSeasonalAnime(season, year, page, perPage, format);
        if ('error' in result) {
          request.log.error(
            { result, season, year, page, perPage, format },
            `External API Error: Failed to fetch season list.`,
          );
          return reply.status(500).send(result);
        }

        if (result && Array.isArray(result.data) && result.data.length > 0) {
          await redisSetCache(cacheKey, result, 168);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching season lists`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get(
    '/mappings/:id',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `public, s-maxage=${6 * 60 * 60}, stale-while-revalidate=300`);

      const id = Number(request.params.id);
      const provider = (request.query.provider as 'allanime' | 'hianime' | 'animepahe' | 'anizone') || 'hianime';

      if (!id) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'id'.",
        });
      }

      if (!allowedProviders.includes(provider)) {
        return reply.status(400).send({
          error: `Invalid provider '${provider}'. Expected one of: ${allowedProviders.join(', ')}`,
        });
      }

      let duration;
      const cacheKey = `anilist-mappings-id-${id}-${provider}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      try {
        const result = await anilist.fetchProviderId(id, provider);
        if ('error' in result) {
          request.log.error({ result, id, provider }, `External API Error: Failed to fetch provider info.`);
          return reply.status(500).send(result);
        }

        if (result && result.data !== null && result.provider !== null && result.data.format.toLowerCase() !== 'movie') {
          result.data.status.toLowerCase() === 'finished' ? (duration = 0) : (duration = 24);
          await redisSetCache(cacheKey, result, duration);
        }
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching provider info`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get(
    '/episodes/:id',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `public, s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

      const id = Number(request.params.id);
      const provider = (request.query.provider as 'allanime' | 'hianime' | 'animepahe' | 'anizone') || 'hianime';

      if (!id) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'id'.",
        });
      }

      if (!allowedProviders.includes(provider)) {
        return reply.status(400).send({
          error: `Invalid provider '${provider}'. Expected one of: ${allowedProviders.join(', ')}`,
        });
      }

      let duration;

      const cacheKey = `anilist-episodes-${id}-${provider}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      try {
        const result = await anilist.fetchAnimeProviderEpisodes(id, provider);
        if ('error' in result) {
          request.log.error({ result, id, provider }, `External API Error: Failed to fetch provider episodes.`);
          return reply.status(500).send(result);
        }

        if (
          result &&
          result.data !== null &&
          Array.isArray(result.providerEpisodes) &&
          result.providerEpisodes.length > 0 &&
          result.data.format.toLowerCase() !== 'movie'
        ) {
          result.data.status.toLowerCase() === 'finished' ? (duration = 168) : (duration = 2);
          await redisSetCache(cacheKey, result, duration);
        }
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching provider episodes`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );

  fastify.get(
    '/sources/:episodeId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=60');

      const episodeId = request.params.episodeId;
      const provider = request.query.provider as 'allanime' | 'hianime' | 'animepahe' | 'kaido' | 'anizone';
      const version = (request.query.version as 'sub' | 'dub' | 'raw') || 'sub';
      let server = request.query.server;

      const allowedSourceProviders = ['allanime', 'hianime', 'animepahe', 'kaido', 'anizone'] as const;
      const validVersions = ['sub', 'dub', 'raw'] as const;
      const validZoroServers = ['hd-1', 'hd-2', 'hd-3'] as const;

      if (!episodeId) {
        return reply.status(400).send({ error: "Missing required path parameter: 'episodeId'." });
      }

      if (!provider) {
        return reply.status(400).send({ error: "Missing required query parameter: 'provider'." });
      }
      if (!allowedSourceProviders.includes(provider)) {
        return reply.status(400).send({
          error: `Invalid provider '${provider}'. Expected one of: ${allowedSourceProviders.join(', ')}`,
        });
      }

      if (!validVersions.includes(version as any)) {
        return reply.status(400).send({
          error: `Invalid category '${version}'. Expected one of: ${validVersions.join(', ')}.`,
        });
      }

      if (provider === 'hianime') {
        if (server) {
          if (!validZoroServers.includes(server as any)) {
            return reply
              .status(400)
              .send({ error: `Invalid server '${server}'. Expected one of: ${validZoroServers.join(', ')}.` });
          }
        } else {
          server = 'hd-2';
        }
      }

      if (provider === 'kaido') {
        if (server) {
          if (!['vidstreaming', 'vidcloud'].includes(server)) {
            return reply.status(400).send({ error: `Invalid server '${server}'. Expected 'vidstreaming' or 'vidcloud'.` });
          }
        } else {
          server = 'vidcloud';
        }
      }

      try {
        let result;

        switch (provider) {
          case 'allanime':
            result = await allanime.fetchSources(episodeId, version);
            break;

          case 'hianime':
            result = await hianime.fetchSources(episodeId, server as 'hd-1' | 'hd-2' | 'hd-3', version);
            break;

          case 'animepahe':
            result = await animepahe.fetchSources(episodeId, version);
            break;

          case 'kaido':
            result = await kaido.fetchSources(episodeId, server as 'vidstreaming' | 'vidcloud', version);
            break;

          case 'anizone':
            result = await anizone.fetchSources(episodeId);
            break;

          default:
            return reply.status(400).send({ error: `Provider '${provider}' is not supported.` });
        }

        if ('error' in result) {
          request.log.error({ result, episodeId, provider, version, server }, `External API Error: Failed to fetch sources`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error: any) {
        request.log.error(
          { error: error?.message ?? error, episodeId, provider, server },
          `Internal runtime error occurred while fetching sources`,
        );
        return reply.status(500).send({ error: 'Internal server error' });
      }
    },
  );
}
