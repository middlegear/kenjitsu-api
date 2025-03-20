import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HiAnime } from 'hakai-extensions';
import { toZoroServers, toCategory } from '../../utils/normalize.js';
import { FastifyParams, FastifyQuery } from '../../utils/types.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';
import { ratelimitOptions, ratelimitPlugin } from '../../config/ratelimit.js';

const zoro = new HiAnime();

export default async function HianimeRoutes(fastify: FastifyInstance) {
  await fastify.register(ratelimitPlugin, {
    ...ratelimitOptions,
  });
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Welcome to Hianime Provider',
    });
  });

  //api/anime/hianime/search?q=''&page=number
  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');
    if (q.length > 100) {
      return reply.status(400).send({ error: 'Query too long' });
    }
    const page = Number(request.query.page) || 1;

    const data = await zoro.search(q, page);
    return reply.send({ data });
  });

  //api/anime/hianime/info/:animeId
  fastify.get('/info/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const animeId = String(request.params.animeId);

    const data = await zoro.fetchInfo(animeId);

    return reply.send({ data });
  });

  //api/anime/hianime/episodes/:id
  fastify.get('/episodes/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const animeId = String(request.params.animeId);
    const data = await zoro.fetchEpisodes(animeId);

    return reply.send({ data });
  });

  //api/anime/hianime/servers/:episodeId
  fastify.get('/servers/:episodeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const episodeId = String(request.params.episodeId);
    const data = await zoro.fetchEpisodeServers(episodeId);

    return reply.send({ data });
  });

  //api/anime/hianime/watch/:episodeId?category=sub&server=hd-1
  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';
      const server = request.query.server || 'hd-1';

      const newserver = toZoroServers(server);
      const newcategory = toCategory(category);

      const cacheKey = `zoro-watch-${episodeId}-${newcategory}-${newserver}`;
      const cachedData = await redisGetCache(cacheKey);
      if (cachedData) {
        return reply.send({
          data: cachedData,
        });
      }
      const data = await zoro.fetchSources(episodeId, newserver, newcategory);

      if (data.data?.sources && Array.isArray(data.data.sources) && data.data.sources.length > 0) {
        await redisSetCache(cacheKey, data, 1);
      }
      return reply.send({ data });
    },
  );
}
