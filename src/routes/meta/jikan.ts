import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Format, HiAnime, Jikan, Seasons } from 'hakai-extensions';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';
import type { FastifyQuery, FastifyParams, AnilistInfo, AnilistRepetitive } from '../../utils/types.js';
import { type AnimeProviderApi, toCategory, toProvider, toZoroServers } from '../../utils/utils.js';

const jikan = new Jikan();
const zoro = new HiAnime();

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
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
        error: result.error,
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

  fastify.get('/info/:malId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const malId = Number(request.params.malId);

    const cacheKey = `jikan-info-${malId}`;
    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);
    const result = await jikan.fetchInfo(malId);

    const cachedData = (await redisGetCache(cacheKey)) as AnilistInfo;

    if ('error' in result) {
      return reply.status(500).send({
        data: result.data,
        error: result.error,
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
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
        error: result.error,
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
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
        error: result.error,
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
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
        error: result.error,
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
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
        error: result.error,
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

  fastify.get(
    '/season',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const season = request.query.season as Seasons;
      const year = Number(request.query.year);
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
          hasNextPage: result.hasNextPage,
          currentPage: result.currentPage,
          total: result.total,
          perPage: result.perPage,
          lastPage: result.lastPage,
          data: result.data,
          error: result.error,
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
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
        error: result.error,
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
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        total: result.total,
        perPage: result.perPage,
        lastPage: result.lastPage,
        data: result.data,
        error: result.error,
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

  fastify.get('/characters/:malId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const malId = Number(request.params.malId);

    reply.header('Cache-Control', `s-maxage=${72 * 60 * 60}, stale-while-revalidate=300`);

    const result = await jikan.fetchAnimeCharacters(malId);

    if ('error' in result) {
      return reply.status(500).send({
        data: result.data,
        error: result.error,
      });
    }
    return reply.status(200).send({
      data: result.data,
    });
  });

  fastify.get(
    '/episodes/:malId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const page = Number(request.query.page) || 1;

      reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

      const result = await jikan.fetchEpisodes(malId, page);
      if ('error' in result) {
        return reply.status(500).send({
          data: result.data,
          error: result.error,
        });
      }
      return reply.status(200).send({
        data: result.data,
      });
    },
  );

  fastify.get(
    '/episode-info/:malId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const episodeNumber = Number(request.query.episode);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const result = await jikan.fetchEpisodeInfo(malId, episodeNumber);
      if ('error' in result) {
        return reply.status(500).send({
          data: result.data,
          error: result.error,
        });
      }
      return reply.status(200).send({
        data: result.data,
      });
    },
  );

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
          data: result.data,
          animeProvider: result.animeProvider,
          error: result.error,
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
          data: result.data,
          providerEpisodes: result.providerEpisodes,
          error: result.error,
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
  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';
      const server = request.query.server || 'hd-2';

      const newserver = toZoroServers(server);
      const newcategory = toCategory(category);

      reply.header('Cache-Control', 's-maxage=420, stale-while-revalidate=60');

      const result = await zoro.fetchSources(episodeId, newserver, newcategory);

      if ('error' in result) {
        return reply.status(500).send({
          error: result.error,
          headers: result.headers,
          data: result.data,
        });
      }
      return reply.status(200).send({ headers: result.headers, data: result.data });
    },
  );
}
