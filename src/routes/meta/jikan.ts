import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Format, Jikan, Seasons } from 'hakai-extensions';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';
import type { FastifyQuery, FastifyParams, AnilistInfo, AnilistRepetitive } from '../../utils/types.js';
import { type AnimeProviderApi, toProvider } from '../../utils/normalize.js';

const jikan = new Jikan();

export default async function JikanRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Welcome to Jikan metadata provider',
    });
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
    perPage = Math.min(perPage, 25);

    reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300');

    const result = await jikan.search(q, page, perPage);

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

  // api/jikan/info/:malId
  fastify.get('/info/:malId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const malId = Number(request.params.malId);

    const cacheKey = `jikan-info-${malId}`;
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);
    const result = await jikan.fetchInfo(malId);

    const cachedData = (await redisGetCache(cacheKey)) as AnilistInfo;

    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
      });
    }
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

  // api/jikan/top-airing?page=number&perPage=number&format=format
  fastify.get('/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);
    const format = (request.query.format as Format) || 'TV';

    reply.header('Cache-Control', `s-maxage=${6 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-top-airing-${page}-${perPage}-${format}`;

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
    const result = await jikan.fetchTopAiring(page, perPage, format);
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

  //api/jikan/most-popular?page=number&perPage=number&format=format
  fastify.get('/most-popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);
    const format = (request.query.format as Format) || 'TV';

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-most-popular${page}-${perPage}-${format}`;

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

    const result = await jikan.fetchMostPopular(page, perPage, format);

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

  //api/jikan/upcoming?page=number&perPage=number
  fastify.get('/upcoming', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-upcoming-${page}-${perPage}`;

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

    const result = await jikan.fetchTopUpcoming(page, perPage);

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

  //api/jikan/movies?page=number&perPage=number
  fastify.get('/movies', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-movies-category-${page}-${perPage}`;

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
    const result = await jikan.fetchTopMovies(page, perPage);

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

  //api/jikan/seasons/:season/:year?page=number&perPage=number
  fastify.get(
    '/seasons/:season/:year',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const season = request.params.season as Seasons;
      const year = Number(request.params.year);
      const format = (request.query.format as Format) || 'TV';
      const page = Number(request.query.page) || 1;
      let perPage = Number(request.query.perPage) || 20;
      perPage = Math.min(perPage, 25);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const cacheKey = `jikan-seasons-${season}-${year}-${page}-${perPage}-${format}`;
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

      const result = await jikan.fetchSeason(season, year, format, page, perPage);

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

  //api/jikan/current-season?page=number&perPage=number&format=string
  fastify.get('/current-season', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const format = (request.query.format as Format) || 'TV';
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);

    reply.header('Cache-Control', `s-maxage=${6 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-current-season-${page}-${perPage}-${format}`;

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
    const result = await jikan.fetchCurrentSeason(page, perPage, format);

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

  //api/jikan/next-season?page=number&perPage=number&format=string
  fastify.get('/next-season', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const format = (request.query.format as Format) || 'TV';
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);

    const cacheKey = `jikan-next-season-${page}-${perPage}-${format}`;

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

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
    const result = await jikan.fetchNextSeason(page, perPage, format);

    if (result.data.length > 0) {
      const cacheableData = {
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
      };

      await redisSetCache(cacheKey, cacheableData, 48);
    }

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

  //api/jikan/characters/:malId
  fastify.get('/characters/:malId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const malId = Number(request.params.malId);

    reply.header('Cache-Control', `s-maxage=${72 * 60 * 60}, stale-while-revalidate=300`);

    const result = await jikan.fetchAnimeCharacters(malId);

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

  //api/jikan/mal-episodes/:malId?page=number
  fastify.get(
    '/mal-episodes/:malId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const page = Number(request.query.page) || 1;

      reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

      const result = await jikan.fetchMalEpisodes(malId, page);
      if ('error' in result) {
        return reply.status(500).send({
          error: result.error,
          data: result.data,
        });
      }
      return reply.status(200).send({
        data: result.data,
      });
    },
  );

  //api/jikan/mal-episode-info/:id/:episodeNumber
  fastify.get(
    '/mal-episode-info/:malId/:episodeNumber',
    async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const episodeNumber = Number(request.params.episodeNumber);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const result = await jikan.fetchMalEpisodeInfo(malId, episodeNumber);
      if ('error' in result) {
        return reply.status(500).send({
          error: result.error,
          data: result.data,
        });
      }
      return reply.status(200).send({
        data: result.data,
      });
    },
  );

  //api/jikan/get-provider/:malId?provider=string
  fastify.get(
    '/get-provider/:malId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const provider = request.query.provider || 'hianime';
      const newprovider = toProvider(provider) as AnimeProviderApi;

      const result = await jikan.fetchProviderAnimeId(malId, newprovider);

      let timecached: number;
      const status = result.data?.status.toLowerCase().trim();
      status === 'finished airing' ? (timecached = 148) : (timecached = 24);

      reply.header('Cache-Control', `s-maxage=${timecached * 60 * 60}, stale-while-revalidate=300`);

      const cacheKey = `jikan-provider-id-${malId}-${newprovider}`;
      if ('error' in result) {
        return reply.status(500).send({
          error: result.error,
          data: result.data,
          animeProvider: result.animeProvider,
        });
      }

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

  //api/jikan/provider-episodes/:malId?provider=string
  fastify.get(
    '/provider-episodes/:malId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const provider = request.query.provider || 'hianime';

      const newprovider = toProvider(provider) as AnimeProviderApi;

      const result = await jikan.fetchAnimeProviderEpisodes(malId, newprovider);

      let timecached: number;
      const status = result.data?.status.toLowerCase().trim();
      status === 'finished airing' ? (timecached = 148) : (timecached = 1);
      reply.header('Cache-Control', `s-maxage=${timecached * 60 * 60}, stale-while-revalidate=300`);

      const cacheKey = `jikan-provider-episodes-${malId}-${newprovider}`;
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
