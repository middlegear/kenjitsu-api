import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Anilist, AnimeProvider } from 'hakai-extensions';
import { toAnilistSeasons, toFormatAnilist, toProvider } from '../../utils/normalize.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';
import { FastifyParams, FastifyQuery } from '../../utils/types.js';

const anilist = new Anilist();

export default async function AnilistRoutes(fastify: FastifyInstance) {
  // api/meta/anilist
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Welcome to Anilist Metadata provider' });
  });

  // api/meta/anilist?q=yoursearchquery&page=number&perpage=number
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

    const data = await anilist.search(q, page, perPage);
    return reply.send({ data });
  });

  // api/meta/anilist/info/:anilistId
  fastify.get('/info/:anilistId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const anilistId = Number(request.params.anilistId);

    const cacheKey = `anilist-info-${anilistId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }
    const data = await anilist.fetchInfo(anilistId);
    let timecached: number;
    const status = data.data?.status.toLowerCase().trim();
    status === 'finished' ? (timecached = 148) : (timecached = 24);

    if (data.success === true && data.data !== null) await redisSetCache(cacheKey, data, timecached);

    return reply.send({ data });
  });

  // api/meta/anilist/top-airing?page=number&perPage=number
  fastify.get('/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const cacheKey = `anilist-top-airing${page}-${perPage}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }
    const data = await anilist.fetchAiring(page, perPage);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 24);

    return reply.send({ data });
  });

  // api/meta/anilist/most-popular?format=string&page=number&perPage=number
  fastify.get('/most-popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const format = request.query.format || 'TV';
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const newformat = toFormatAnilist(format);

    const cacheKey = `anilist-most-popular-${page}-${perPage}-${newformat}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }

    const data = await anilist.fetchMostPopular(page, perPage, newformat);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 148);
    return reply.send({ data });
  });

  // api/meta/anilist/top-anime?format=string&page=number&perPage=number
  fastify.get('/top-anime', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const format = request.query.format || 'TV';
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const newformat = toFormatAnilist(format);

    const cacheKey = `anilist-top-anime-${page}-${perPage}-${newformat}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }

    const data = await anilist.fetchTopRatedAnime(page, perPage, newformat);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 148);
    return reply.send({ data });
  });

  // api/meta/anilist/upcoming?page=number&perPage=number
  fastify.get('/upcoming', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const cacheKey = `anilist-upcoming-${page}-${perPage}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({ data: cachedData });
    }

    const data = await anilist.fetchTopUpcoming(page, perPage);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 24);

    return reply.send({ data });
  });

  // api/meta/anilist/characters/:anilistId
  fastify.get('/characters/:anilistId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const anilistId = Number(request.params.anilistId);
    const data = await anilist.fetchCharacters(anilistId);
    return reply.send({ data });
  });

  // api/meta/anilist/trending?page=number&perPage=number
  fastify.get('/trending', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    let perPage = Number(request.query.perPage) || 20;
    perPage = Math.min(perPage, 50);

    const cacheKey = `anilist-trending-${page}-${perPage}`;
    const cachedData = await redisGetCache(cacheKey);

    if (cachedData) {
      return reply.send({ data: cachedData });
    }
    const data = await anilist.fetchTrending(page, perPage);

    if (data.success === true && data.data.length > 0) await redisSetCache(cacheKey, data, 6);

    return reply.send({ data });
  });

  // api/meta/anilist/related/:anilistId
  fastify.get('/related/:anilistId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const anilistId = Number(request.params.anilistId);

    const data = await anilist.fetchRelatedAnime(anilistId);
    return reply.send({ data });
  });

  // api/meta/anilist/seasons/:season/:year?format=string
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

      const data = await anilist.fetchSeasonalAnime(newseason, year, newformat, page, perPage);

      return reply.send({ data });
    },
  );

  //api/meta/anilist/get-provider/:anilistId?provider=string
  fastify.get(
    '/get-provider/:anilistId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const anilistId = Number(request.params.anilistId);
      const provider = request.query.provider || 'hianime';

      const newprovider = toProvider(provider) as AnimeProvider;

      const cacheKey = `anilist-provider-id-${anilistId}-${newprovider}`;

      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({ data: cachedData });
      }
      const data = await anilist.fetchProviderAnimeId(anilistId, newprovider);

      let timecached: number;
      const status = data.data?.status.toLowerCase().trim();
      status === 'finished' ? (timecached = 148) : (timecached = 24);

      if (data.success === true && data.animeProvider !== null) await redisSetCache(cacheKey, data, timecached);

      return reply.send({ data });
    },
  );

  //api/meta/anilist/provider-episodes/:anilistId?provider=string
  fastify.get(
    '/provider-episodes/:anilistId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const anilistId = Number(request.params.anilistId);
      const provider = request.query.provider || 'hianime';

      const newprovider = toProvider(provider);

      const cacheKey = `anilist-provider-episodes-${anilistId}-${newprovider}`;
      console.log(newprovider);
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({ data: cachedData });
      }
      const data = await anilist.fetchAnimeProviderEpisodes(anilistId, newprovider);

      let timecached: number;
      const status = data.data?.status.toLowerCase().trim();
      status === 'finished' ? (timecached = 148) : (timecached = 1);

      if (data.success === true && data.providerEpisodes.length > 0) await redisSetCache(cacheKey, data, timecached);

      return reply.send({ data });
    },
  );
}
