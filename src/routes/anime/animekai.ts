import { AnimeKai } from 'hakai-extensions';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FastifyParams, FastifyQuery } from '../../utils/types.js';
import { toCategory } from '../../utils/normalize.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';
import { ratelimitPlugin, ratelimitOptions } from '../../config/ratelimit.js';

const animekai = new AnimeKai();

export default async function AnimekaiRoutes(fastify: FastifyInstance) {
  await fastify.register(ratelimitPlugin, {
    ...ratelimitOptions,
  });
  ///
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Welcome to Animekai Provider',
    });
  });

  // api/anime/animekai/search?q=string&page=number
  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');
    if (q.length > 100) {
      return reply.status(400).send({ error: 'Query too long' });
    }
    const page = Number(request.query.page) || 1;

    const data = await animekai.search(q, page);
    return reply.send({ data });
  });

  //api/anime/animekai/info/:animeId
  fastify.get('/info/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const animeId = String(request.params.animeId);
    const data = await animekai.fetchAnimeInfo(animeId);

    return reply.send({ data });
  });

  //api/anime/animekai/servers/:episodeId&category=''
  fastify.get(
    '/servers/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';

      const newcategory = toCategory(category);

      const cacheKey = `animekai-servers-${episodeId}-${newcategory}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({
          data: cachedData,
        });
      }

      const data = await animekai.fetchServers(episodeId, newcategory);

      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        await redisSetCache(cacheKey, data, 3);
      }

      return reply.send({ data });
    },
  );

  //api/anime/animekai/watch/:episodeId&category=''
  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';

      const newcategory = toCategory(category);

      const cacheKey = `animekai-watch-${episodeId}-${newcategory}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({
          data: cachedData,
        });
      }
      const data = await animekai.fetchSources(episodeId, newcategory);
      if (data?.data?.sources && Array.isArray(data.data.sources) && data.data.sources.length > 0) {
        await redisSetCache(cacheKey, data, 1);
      }

      return reply.send({ data });
    },
  );
}
