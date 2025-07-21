import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Anilist } from 'hakai-extensions';
import { toFormatAnilist, type AnimeProviderApi, toAnilistSeasons, toProvider } from '../../utils/normalize.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';
import type { AnilistInfo, AnilistRepetitive, FastifyParams, FastifyQuery } from '../../utils/types.js';

const anilist = new Anilist();

export default async function AnilistRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Welcome to Anilist Metadata provider' });
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');
    if (q.length > 100) {
      return reply.status(400).send({ error: 'Query too long' });
    }
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const result = await anilist.search(q, page, perPage);
    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
      });
    }
    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      total: result.total,
      perPage: result.perPage,
      lastPage: result.lastPage,
      data: result.data,
    });
  });

  fastify.get('/info/:anilistId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const anilistId = Number(request.params.anilistId);

    const cacheKey = `anilist-info-${anilistId}`;

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const result = await anilist.fetchInfo(anilistId);

    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
      });
    }

    const cachedData = (await redisGetCache(cacheKey)) as AnilistInfo;

    if (cachedData) {
      return reply.status(200).send({
        data: cachedData.data,
      });
    }

    if (result.data !== null) {
      const cacheableData = {
        data: result.data,
      };

      await redisSetCache(cacheKey, cacheableData, 24);
    }
    return reply.status(200).send({
      data: result.data,
    });
  });

  fastify.get('/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const cacheKey = `anilist-top-airing${page}-${perPage}`;

    reply.header('Cache-Control', `s-maxage=${6 * 60 * 60}, stale-while-revalidate=300`);

    const cachedData = (await redisGetCache(cacheKey)) as AnilistRepetitive;
    if (cachedData) {
      return reply.status(200).send({
        hasNextPage: cachedData.hasNextPage,
        currentPage: cachedData.currentPage,
        total: cachedData.total,
        perPage: cachedData.perPage,
        lastPage: cachedData.lastPage,
        data: cachedData.data,
      });
    }
    const result = await anilist.fetchAiring(page, perPage);
    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
      });
    }
    if (result.data.length > 0) {
      const cacheableData = {
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
      };

      await redisSetCache(cacheKey, cacheableData, 6);
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      total: result.total,
      perPage: result.perPage,
      lastPage: result.lastPage,
      data: result.data,
    });
  });

  // api/anilist/most-popular?format=string&page=number&perPage=number
  fastify.get('/most-popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const format = request.query.format || 'TV';
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const newformat = toFormatAnilist(format);

    const cacheKey = `anilist-most-popular-${page}-${perPage}-${newformat}`;

    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const cachedData = (await redisGetCache(cacheKey)) as AnilistRepetitive;
    if (cachedData) {
      return reply.status(200).send({
        hasNextPage: cachedData.hasNextPage,
        currentPage: cachedData.currentPage,
        total: cachedData.total,
        perPage: cachedData.perPage,
        lastPage: cachedData.lastPage,
        data: cachedData.data,
      });
    }

    const result = await anilist.fetchMostPopular(page, perPage, newformat);

    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
      });
    }
    if (result.data.length > 0) {
      const cacheableData = {
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
      };

      await redisSetCache(cacheKey, cacheableData, 148);
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      total: result.total,
      perPage: result.perPage,
      lastPage: result.lastPage,
      data: result.data,
    });
  });

  fastify.get('/top-anime', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const format = request.query.format || 'TV';
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const newformat = toFormatAnilist(format);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `anilist-top-anime-${page}-${perPage}-${newformat}`;
    const cachedData = (await redisGetCache(cacheKey)) as AnilistRepetitive;
    if (cachedData) {
      return reply.status(200).send({
        data: cachedData.data,
        hasNextPage: cachedData.hasNextPage,
        currentPage: cachedData.currentPage,
        total: cachedData.total,
        perPage: cachedData.perPage,
        lastPage: cachedData.lastPage,
      });
    }

    const result = await anilist.fetchTopRatedAnime(page, perPage, newformat);

    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
      });
    }
    if (result.data.length > 0) {
      const cacheableData = {
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
      };

      await redisSetCache(cacheKey, cacheableData, 24);
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      total: result.total,
      perPage: result.perPage,
      lastPage: result.lastPage,
      data: result.data,
    });
  });

  fastify.get('/upcoming', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const cacheKey = `anilist-upcoming-${page}-${perPage}`;

    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    const cachedData = (await redisGetCache(cacheKey)) as AnilistRepetitive;
    if (cachedData) {
      return reply.status(200).send({
        hasNextPage: cachedData.hasNextPage,
        currentPage: cachedData.currentPage,
        total: cachedData.total,
        perPage: cachedData.perPage,
        lastPage: cachedData.lastPage,
        data: cachedData.data,
      });
    }
    const result = await anilist.fetchTopUpcoming(page, perPage);

    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
      });
    }
    if (result.data.length > 0) {
      const cacheableData = {
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
      };

      await redisSetCache(cacheKey, cacheableData, 12);
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      total: result.total,
      perPage: result.perPage,
      lastPage: result.lastPage,
      data: result.data,
    });
  });

  fastify.get('/characters/:anilistId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const anilistId = Number(request.params.anilistId);

    reply.header('Cache-Control', `s-maxage=${96 * 60 * 60}, stale-while-revalidate=300`);

    const result = await anilist.fetchCharacters(anilistId);
    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
      });
    }
    return reply.status(200).send({
      data: result.data,
    });
  });

  fastify.get('/trending', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `anilist-trending-${page}-${perPage}`;

    const cachedData = (await redisGetCache(cacheKey)) as AnilistRepetitive;
    if (cachedData) {
      return reply.status(200).send({
        hasNextPage: cachedData.hasNextPage,
        currentPage: cachedData.currentPage,
        total: cachedData.total,
        perPage: cachedData.perPage,
        lastPage: cachedData.lastPage,
        data: cachedData.data,
      });
    }
    const result = await anilist.fetchTrending(page, perPage);

    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
      });
    }
    if (result.data.length > 0) {
      const cacheableData = {
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
      };

      await redisSetCache(cacheKey, cacheableData, 2);
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      total: result.total,
      perPage: result.perPage,
      lastPage: result.lastPage,
      data: result.data,
    });
  });

  fastify.get('/related/:anilistId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const anilistId = Number(request.params.anilistId);
    reply.header('Cache-Control', `s-maxage=${96 * 60 * 60}, stale-while-revalidate=300`);

    const result = await anilist.fetchRelatedAnime(anilistId);
    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
      });
    }
    return reply.status(200).send({
      data: result.data,
    });
  });

  fastify.get(
    '/seasons/:season/:year',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const season = String(request.params.season);
      const year = Number(request.params.year);
      const format = request.query.format || 'TV';
      const page = Number(request.query.page) || 1;
      let perPage = Number(request.query.perPage) || 20;
      perPage = Math.min(perPage, 50);

      const newformat = toFormatAnilist(format);
      const newseason = toAnilistSeasons(season);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const result = await anilist.fetchSeasonalAnime(newseason, year, newformat, page, perPage);

      if ('error' in result) {
        return reply.status(500).send({
          error: result.error,
          data: result.data,
          hasNextPage: result.hasNextPage,
          currentPage: result.currentPage,
          total: result.total,
          perPage: result.perPage,
          lastPage: result.lastPage,
        });
      }
      return reply.status(200).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
      });
    },
  );

  fastify.get(
    '/get-provider/:anilistId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const anilistId = Number(request.params.anilistId);
      const provider = request.query.provider || 'hianime';

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const newprovider = toProvider(provider) as AnimeProviderApi;

      const result = await anilist.fetchProviderAnimeId(anilistId, newprovider);
      if ('error' in result) {
        return reply.status(500).send({
          error: result.error,
          data: result.data,
          animeProvider: result.animeProvider,
        });
      }
      const cacheKey = `anilist-provider-id-${anilistId}-${newprovider}`;

      const cachedData = (await redisGetCache(cacheKey)) as AnilistInfo;
      if (cachedData) {
        return reply.status(200).send({
          data: cachedData.data,
          animeProvider: cachedData.animeProvider,
        });
      }
      if (result.data !== null && result.animeProvider !== null) {
        const cacheableData = {
          data: result.data,
          animeProvider: result.animeProvider,
        };

        await redisSetCache(cacheKey, cacheableData, 2);
      }

      return reply.status(200).send({
        data: result.data,
        animeProvider: result.animeProvider,
      });
    },
  );

  fastify.get(
    '/provider-episodes/:anilistId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const anilistId = Number(request.params.anilistId);
      const provider = request.query.provider || 'hianime';

      const newprovider = toProvider(provider);

      const result = await anilist.fetchAnimeProviderEpisodes(anilistId, newprovider);

      let timecached: number;
      const status = result.data?.status.toLowerCase().trim();
      status === 'finished' ? (timecached = 148) : (timecached = 24);

      reply.header('Cache-Control', `s-maxage=${timecached * 60 * 60}, stale-while-revalidate=300`);

      const cacheKey = `anilist-provider-episodes-${anilistId}-${newprovider}`;

      const cachedData = (await redisGetCache(cacheKey)) as AnilistInfo;
      if (cachedData) {
        return reply.status(200).send({
          data: cachedData.data,
          providerEpisodes: cachedData.providerEpisodes,
        });
      }
      if ('error' in result) {
        return reply.status(500).send({
          error: result.error,
          data: result.data,
          providerEpisodes: result.providerEpisodes,
        });
      }

      if (result.data !== null && result.providerEpisodes.length > 0) {
        const cacheableData = {
          data: result.data,
          providerEpisodes: result.providerEpisodes,
        };
        await redisSetCache(cacheKey, cacheableData, timecached);
      }
      return reply.status(200).send({
        data: result.data,
        providerEpisodes: result.providerEpisodes,
      });
    },
  );
}
