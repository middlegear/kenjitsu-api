import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Anilist, type Seasons, type IMetaFormat } from '@middlegear/kenjitsu-extensions';
import { IAMetaFormatArr, IAnimeSeasonsArr, type FastifyParams, type FastifyQuery } from '../../utils/types.js';
import { redisSetCache, redisGetCache } from '../../middleware/cache.js';

const anilist = new Anilist();

export default async function AnilistRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Welcome to Anilist Metadata provider' });
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
      return reply.status(400).send({ error: 'query string too long' });
    }

    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const result = await anilist.search(q, page, perPage);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/info/:anilistId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    let duration;
    const anilistId = Number(request.params.anilistId);

    if (!anilistId) {
      return reply.status(400).send({ error: 'Missing required path params: anilistId' });
    }

    const cacheKey = `anilist-info-${anilistId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await anilist.fetchInfo(anilistId);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && result.data !== null) {
      result.data.status.toLowerCase() === 'finished' ? (duration = 0) : (duration = 24);
      await redisSetCache(cacheKey, result, duration);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const cacheKey = `anilist-top-airing-${page}`;
    const cacheData = await redisGetCache(cacheKey);
    if (cacheData) {
      return reply.status(200).send(cacheData);
    }

    const result = await anilist.fetchTopAiring(page, perPage);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 24);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/most-popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${200 * 60 * 60}, stale-while-revalidate=300`);

    const format = (request.query.format as IMetaFormat) || 'TV';
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    if (!IAMetaFormatArr.includes(format)) {
      return reply.status(400).send({
        error: `Invalid format: '${format}'. Expected one of ${IAMetaFormatArr.join(', ')}.`,
      });
    }

    const cacheKey = `anilist-most-popular-${format}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await anilist.fetchMostPopular(page, perPage, format);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 720);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/top-anime', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const format = (request.query.format as IMetaFormat) || 'TV';
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    if (!IAMetaFormatArr.includes(format)) {
      return reply.status(400).send({
        error: `Invalid format: '${format}'. Expected one of ${IAMetaFormatArr.join(', ')}.`,
      });
    }
    const cacheKey = `anilist-top-anime-${format}-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await anilist.fetchTopRatedAnime(page, perPage, format);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 720);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/upcoming', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const cacheKey = `anilist-upcoming-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await anilist.fetchTopUpcoming(page, perPage);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 168);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/characters/:anilistId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const anilistId = Number(request.params.anilistId);

    const cacheKey = `anilist-characters-${anilistId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await anilist.fetchCharacters(anilistId);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && result.data !== null) {
      await redisSetCache(cacheKey, result, 0);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/trending', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const cacheKey = `anilist-trending-${page}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await anilist.fetchTrending(page, perPage);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 24);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/airing-schedule', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    const score = Number(request.query.score) || 60;

    const cacheKey = `anilist-schedule-${page}-${score}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await anilist.fetchAiringSchedule(page, score);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 6);
    }

    return reply.status(200).send(result);
  });

  fastify.get(
    '/media-schedule/:anilistId',
    async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

      const anilistId = Number(request.params.anilistId);

      if (!anilistId) {
        return reply.status(400).send({ error: 'Missing required path params: anilistId' });
      }
      const cacheKey = `anilist-media-schedule-${anilist}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await anilist.fetchMediaSchedule(anilistId);
      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && result.data !== null) {
        await redisSetCache(cacheKey, result, 12);
      }

      return reply.status(200).send(result);
    },
  );

  fastify.get('/related/:anilistId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

    const anilistId = Number(request.params.anilistId);

    const cacheKey = `anilist-related-${anilistId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.status(200).send(cachedData);
    }

    const result = await anilist.fetchRelatedAnime(anilistId);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    if (result && Array.isArray(result.data) && result.data.length > 0) {
      await redisSetCache(cacheKey, result, 178);
    }

    return reply.status(200).send(result);
  });

  fastify.get(
    '/season',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${168 * 60 * 60}, stale-while-revalidate=300`);

      const season = request.query.season as Seasons;
      const year = Number(request.query.year);
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
          error: "Missing required query parameter: 'season'.",
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

      const result = await anilist.fetchSeasonalAnime(season, year, page, perPage, format);
      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && Array.isArray(result.data) && result.data.length > 0) {
        await redisSetCache(cacheKey, result, 168);
      }

      return reply.status(200).send(result);
    },
  );

  fastify.get(
    '/get-provider/:anilistId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${4 * 60 * 60}, stale-while-revalidate=300`);

      const anilistId = Number(request.params.anilistId);
      const provider = (request.query.provider as 'allanime' | 'hianime' | 'animepahe') || 'hianime';

      if (!anilistId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'anilistId'.",
        });
      }
      if (provider !== 'allanime' && provider !== 'hianime' && provider !== 'animepahe') {
        return reply.status(400).send({
          error: `Invalid provider ${provider} .Expected provider query paramater to be  'allanime' or 'hianime'or 'animepahe `,
        });
      }

      let duration;
      const cacheKey = `anilist-provider-id-${anilistId}-${provider}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await anilist.fetchProviderId(anilistId, provider);
      if ('error' in result) {
        return reply.status(500).send(result);
      }

      if (result && result.data !== null && result.provider !== null && result.data.format.toLowerCase() !== 'movie') {
        result.data.status.toLowerCase() === 'finished' ? (duration = 0) : (duration = 24);
        await redisSetCache(cacheKey, result, duration);
      }
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    '/provider-episodes/:anilistId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

      const anilistId = Number(request.params.anilistId);
      const provider = (request.query.provider as 'allanime' | 'hianime' | 'animepahe') || 'hianime';

      if (!anilistId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'anilistId'.",
        });
      }
      if (provider !== 'allanime' && provider !== 'hianime' && provider !== 'animepahe') {
        return reply.status(400).send({
          error: `Invalid provider ${provider} .Expected provider query paramater to be  'allanime' or 'hianime'or 'animepahe `,
        });
      }

      let duration;

      const cacheKey = `anilist-provider-episodes-${anilistId}-${provider}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.status(200).send(cachedData);
      }

      const result = await anilist.fetchAnimeProviderEpisodes(anilistId, provider);
      if ('error' in result) {
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
    },
  );

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

      const episodeId = String(request.params.episodeId);

      const validCategories = ['sub', 'dub', 'raw'] as const;
      const validServers = ['hd-1', 'hd-2', 'hd-3'] as const;

      const category = (request.query.category as string) || 'sub';
      const server = (request.query.server as string) || 'hd-2';

      if (!episodeId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'episodeId'.",
        });
      }

      if (!validCategories.includes(category as any)) {
        return reply.status(400).send({
          error: `Invalid category '${category}'. Expected one of ${validCategories.join(', ')}.`,
        });
      }

      if (episodeId.includes('hianime')) {
        if (!validServers.includes(server as any)) {
          return reply.status(400).send({
            error: `Invalid streaming server '${server}'. Expected one of ${validServers.join(', ')}.`,
          });
        }
      }

      let result;

      if (episodeId.includes('hianime')) {
        result = await anilist.fetchHianimeProviderSources(
          episodeId,
          category as (typeof validCategories)[number],
          server as (typeof validServers)[number],
        );
      } else if (episodeId.includes('allanime')) {
        result = await anilist.fetchAllAnimeProviderSources(episodeId, category as (typeof validCategories)[number]);
      } else if (episodeId.includes('pahe')) {
        result = await anilist.fetchAnimePaheProviderSources(episodeId, category as (typeof validCategories)[number]);
      } else
        return reply.status(400).send({
          error: `Unsupported  episodeId: '${episodeId}' Fetch the right episodeId from api/anilist/provider-episodes/:anilistId.`,
        });

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    },
  );
}
