import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  Anilist,
  AllAnime,
  Anizone,
  Animepahe,
  HiAnime,
  type Seasons,
  type IMetaFormat,
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

export default async function AnilistRoutes(fastify: FastifyInstance) {
  fastify.get('/anime/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

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
    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

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
      reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

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
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

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
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

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

  fastify.get('/schedule/airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    const score = Number(request.query.score) || 60;

    const cacheKey = `anilist-schedule-${page}-${score}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    try {
      const result = await anilist.fetchAiringSchedule(page, score);
      if ('error' in result) {
        request.log.error({ result, page, score }, `External API Error: Failed to fetch airing schedule.`);
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 6);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred while fetching airing schedule`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/schedule/:id', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

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
        await redisSetCache(cacheKey, result, 12);
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
      reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

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
      reply.header('Cache-Control', `s-maxage=${4 * 60 * 60}, stale-while-revalidate=300`);

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
      reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

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
          result.data.status.toLowerCase() === 'finished' ? (duration = 0) : (duration = 2);
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
      reply.header('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

      const episodeId = String(request.params.episodeId);

      const validCategories = ['sub', 'dub', 'raw'] as const;
      const validServers = ['hd-1', 'hd-2', 'hd-3'] as const;

      const version = request.query.version || 'sub';
      const server = (request.query.server as string) || 'hd-2';

      if (!episodeId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'episodeId'.",
        });
      }

      if (!validCategories.includes(version as any)) {
        return reply.status(400).send({
          error: `Invalid category '${version}'. Expected one of ${validCategories.join(', ')}.`,
        });
      }

      if (episodeId.includes('hianime')) {
        if (!validServers.includes(server as any)) {
          return reply.status(400).send({
            error: `Invalid streaming server '${server}'. Expected one of ${validServers.join(', ')}.`,
          });
        }
      }

      try {
        let result;

        if (episodeId.includes('hianime')) {
          result = await hianime.fetchSources(
            episodeId,
            server as (typeof validServers)[number],
            version as (typeof validCategories)[number],
          );
        } else if (episodeId.includes('allanime')) {
          result = await allanime.fetchSources(episodeId, version as 'sub' | 'dub');
        } else if (episodeId.includes('pahe')) {
          result = await animepahe.fetchSources(episodeId, version as 'sub' | 'dub');
        } else if (episodeId.includes('anizone')) {
          result = await anizone.fetchSources(episodeId);
        } else
          return reply.status(400).send({
            error: `Unsupported  episodeId: '${episodeId}' Fetch the right episodeId from api/anilist/episodes/:id.`,
          });

        if ('error' in result) {
          request.log.error({ result, episodeId, version }, `External API Error: Failed to fetch sources`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching sources`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );
}
