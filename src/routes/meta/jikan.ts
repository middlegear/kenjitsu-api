import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AnimeProvider, Format, Jikan, Seasons } from 'hakai-extensions';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';
import { FastifyQuery, FastifyParams } from '../../utils/types.js';
import { toProvider } from '../../utils/normalize.js';

const jikan = new Jikan();

export default async function JikanRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Welcome to Jikan metadata provider',
    });
  });

  // api/jikan/search?q=string&page=number&perPage=number
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

    const data = await jikan.search(q, page, perPage);

    return reply.send({ data });
  });

  // api/jikan/info/:malId
  fastify.get('/info/:malId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const malId = Number(request.params.malId);

    const cacheKey = `jikan-info-${malId}`;

    const data = await jikan.fetchInfo(malId);

    let timecached: number;
    const status = data.data?.status.toLowerCase().trim();
    status === 'finished airing' ? (timecached = 148) : (timecached = 4);

    reply.header('Cache-Control', `s-maxage=${timecached * 60 * 60}, stale-while-revalidate=300`);

    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ cachedData });
    }

    if (data.success === true && data.data !== null) await redisSetCache(cacheKey, data, timecached);

    return reply.send({ data });
  });

  // api/jikan/top-airing?page=number&perPage=number&format=format
  fastify.get('/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);
    const format = (request.query.format as Format) || 'TV';

    reply.header('Cache-Control', `s-maxage=${6 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-top-airing-${page}-${perPage}-${format}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }

    const data = await jikan.fetchTopAiring(page, perPage, format);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 6);

    return reply.send({ data });
  });

  //api/jikan/most-popular?page=number&perPage=number&format=format
  fastify.get('/most-popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);
    const format = (request.query.format as Format) || 'TV';

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-most-popular${page}-${perPage}-${format}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }

    const data = await jikan.fetchMostPopular(page, perPage, format);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 24);

    return reply.send({ data });
  });

  //api/jikan/upcoming?page=number&perPage=number
  fastify.get('/upcoming', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-upcoming-${page}-${perPage}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }

    const data = await jikan.fetchTopUpcoming(page, perPage);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 24);

    return reply.send({ data });
  });

  //api/jikan/movies?page=number&perPage=number
  fastify.get('/movies', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-movies-category-${page}-${perPage}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ cachedData });
    }

    const data = await jikan.fetchTopMovies(page, perPage);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 24);

    return reply.send({ data });
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
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({ data: cachedData });
      }

      const data = await jikan.fetchSeason(season, year, format, page, perPage);

      if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 24);

      return reply.send({ data });
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
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }

    const data = await jikan.fetchCurrentSeason(page, perPage, format);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 6);

    return reply.send({ data });
  });

  //api/jikan/next-season?page=number&perPage=number&format=string
  fastify.get('/next-season', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const format = (request.query.format as Format) || 'TV';
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 25);

    const cacheKey = `jikan-next-season-${page}-${perPage}-${format}`;

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }
    const data = await jikan.fetchNextSeason(page, perPage, format);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 24);
    return reply.send({ data });
  });

  //api/jikan/characters/:malId
  fastify.get('/characters/:malId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const malId = Number(request.params.malId);

    reply.header('Cache-Control', `s-maxage=${72 * 60 * 60}, stale-while-revalidate=300`);

    const cacheKey = `jikan-characters-${malId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }

    const data = await jikan.fetchAnimeCharacters(malId);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 72);

    return reply.send({ data });
  });

  //api/jikan/mal-episodes/:malId?page=number
  fastify.get(
    '/mal-episodes/:malId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const page = Number(request.query.page) || 1;

      reply.header('Cache-Control', `s-maxage=${6 * 60 * 60}, stale-while-revalidate=300`);

      const cacheKey = `mal-episodes-${malId}-${page}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({ data: cachedData });
      }

      const data = await jikan.fetchMalEpisodes(malId, page);

      if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 5);

      return reply.send({ data });
    },
  );

  //api/jikan/mal-episode-info/:id/:episodeNumber
  fastify.get(
    '/mal-episode-info/:malId/:episodeNumber',
    async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const episodeNumber = Number(request.params.episodeNumber);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const cacheKey = `mal-episode-info${malId}-${episodeNumber}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({ data: cachedData });
      }

      const data = await jikan.fetchMalEpisodeInfo(malId, episodeNumber);

      if (data.success === true && data.data !== null) await redisSetCache(cacheKey, data, 24);
      return reply.send({ data });
    },
  );

  //api/jikan/get-provider/:malId?provider=string
  fastify.get(
    '/get-provider/:malId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const provider = request.query.provider || 'hianime';
      const newprovider = toProvider(provider) as AnimeProvider;

      const data = await jikan.fetchProviderAnimeId(malId, newprovider);

      let timecached: number;
      const status = data.data?.status.toLowerCase().trim();
      status === 'finished airing' ? (timecached = 148) : (timecached = 12);

      reply.header('Cache-Control', `s-maxage=${timecached * 60 * 60}, stale-while-revalidate=300`);

      const cacheKey = `jikan-provider-id-${malId}-${newprovider}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({ data: cachedData });
      }

      if (data.success === true && data.data !== null) await redisSetCache(cacheKey, data, timecached);
      return reply.send({ data });
    },
  );

  //api/jikan/provider-episodes/:malId?provider=string
  fastify.get(
    '/provider-episodes/:malId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const malId = Number(request.params.malId);
      const provider = request.query.provider || 'hianime';

      const newprovider = toProvider(provider) as AnimeProvider;

      const data = await jikan.fetchAnimeProviderEpisodes(malId, newprovider);

      let timecached: number;
      const status = data.data?.status.toLowerCase().trim();
      status === 'finished airing' ? (timecached = 24) : (timecached = 1);
      reply.header('Cache-Control', `s-maxage=${timecached * 60 * 60}, stale-while-revalidate=300`);

      const cacheKey = `jikan-provider-episodes-${malId}-${newprovider}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({ data: cachedData });
      }

      if (data.success === true && data.providerEpisodes.length > 0) await redisSetCache(cacheKey, data, timecached);

      return reply.send({ data });
    },
  );
}
