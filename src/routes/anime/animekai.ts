import { AnimeKai } from 'hakai-extensions';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FastifyParams, FastifyQuery } from '../../utils/types.js';
import { toCategory } from '../../utils/normalize.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const animekai = new AnimeKai();

export default async function AnimekaiRoutes(fastify: FastifyInstance) {
  ///
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Welcome to Animekai Provider',
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

    const data = await animekai.search(q, page);
    return reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300').send({ data });
  });

  fastify.get('/info/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const animeId = String(request.params.animeId);
    const cacheKey = `animekai-episodesinfo-${animeId}`;
    const cachedData = await redisGetCache(cacheKey);
    if (cachedData) {
      return reply.send({
        data: cachedData,
      });
    }
    let cacheTime = 30; // 1 min
    const data = await animekai.fetchAnimeInfo(animeId);

    const status = data.data?.status?.toLowerCase().trim();
    if (status === 'completed') {
      cacheTime = 60 * 12; // 12 hours if completed try a test with 24 hrs
      await redisSetCache(cacheKey, data, 148);
    }
    /// 30 for airing while 12 hours for completed revalidation 5 mins

    return reply.header('Cache-Control', `s-maxage=${cacheTime * 60}, stale-while-revalidate=300`).send({ data });
  });

  //api/animekai/servers/:episodeId&category=''
  fastify.get(
    '/servers/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';

      const newcategory = toCategory(category);

      const data = await animekai.fetchServers(episodeId, newcategory);

      return reply.header('Cache-Control', `s-maxage=300, stale-while-revalidate=300`).send({ data });
    },
  );

  //api/animekai/watch/:episodeId&category=''
  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';

      const newcategory = toCategory(category);

      const data = await animekai.fetchSources(episodeId, newcategory);

      return reply.header('Cache-Control', `s-maxage=300, stale-while-revalidate=300`).send({ data });
    },
  );
}
