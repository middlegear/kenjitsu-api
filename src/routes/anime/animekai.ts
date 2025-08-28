import { AnimeKai } from '@middlegear/hakai-extensions';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AnimekaiInfo, FastifyParams, FastifyQuery } from '../../utils/types.js';
import { toCategory } from '../../utils/utils.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const animekai = new AnimeKai();

export default async function AnimekaiRoutes(fastify: FastifyInstance) {
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
    if (!q.length) {
      return reply.status(400).send({ error: 'Query string cannot be empty' });
    }

    const page = Number(request.query.page) || 1;

    reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300');

    const result = await animekai.search(q, page);
    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
      });
    }
    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      lastPage: result.lastPage,
      data: result.data,
    });
  });

  fastify.get('/info/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const animeId = String(request.params.animeId);
    const cacheKey = `animekai-episodesinfo-${animeId}`;

    let timecached: number;

    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const result = await animekai.fetchAnimeInfo(animeId);

    if ('error' in result) {
      return reply.status(500).send({ error: result.error, data: result.data, providerEpisodes: result.providerEpisodes });
    }

    const status = result.data?.status?.toLowerCase().trim();
    status === 'completed' ? (timecached = 24) : (timecached = 1);

    const cachedData = (await redisGetCache(cacheKey)) as AnimekaiInfo;

    if (cachedData) {
      return reply.status(200).send({
        data: cachedData.data,
        providerEpisodes: cachedData.providerEpisodes,
      });
    }

    if (result.data && result.providerEpisodes.length > 0) {
      const cacheableData = {
        data: result.data,
        providerEpisodes: result.providerEpisodes,
      };
      await redisSetCache(cacheKey, cacheableData, timecached);
    }

    return reply.status(200).send({ data: result.data, providerEpisodes: result.providerEpisodes });
  });

  //api/animekai/servers/:episodeId&category=''
  fastify.get(
    '/servers/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';

      if (!episodeId) {
        return reply.status(400).send({ error: 'Missing required params: EpisodeId' });
      }

      const newcategory = toCategory(category);
      reply.header('Cache-Control', 's-maxage=120, stale-while-revalidate=180');

      const result = await animekai.fetchServers(episodeId, newcategory);

      if ('error' in result) {
        return reply.status(500).send({ error: result.error, data: result.data });
      }

      if (result.data.length === 0) {
        return reply.status(500).send({ data: [], error: 'Internal Server Error' });
      }

      return reply.status(200).send({ data: result.data });
    },
  );
  //api/animekai/watch/:episodeId&category=''
  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';

      if (!episodeId) {
        return reply.status(400).send({ error: 'Missing required params: EpisodeId' });
      }

      const newcategory = toCategory(category);

      reply.header('Cache-Control', 's-maxage=120, stale-while-revalidate=180');

      const result = await animekai.fetchSources(episodeId, newcategory);

      if ('error' in result) {
        return reply.status(500).send({ error: result.error, headers: result.headers, data: result.data });
      }

      return reply.status(200).send({ headers: result.headers, data: result.data });
    },
  );
}
