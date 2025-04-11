import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HiAnime } from 'hakai-extensions';
import { toZoroServers, toCategory } from '../../utils/normalize.js';
import { FastifyParams, FastifyQuery } from '../../utils/types.js';

const zoro = new HiAnime();

export default async function HianimeRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Welcome to Hianime Provider',
    });
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');
    if (q.length > 100) {
      return reply.status(400).send({ error: 'Query too long' });
    }
    if (!q) {
      return reply.status(400).send({ error: 'Missing required params' });
    }
    const page = Number(request.query.page) || 1;

    reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300');

    const result = await zoro.search(q, page);
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

    reply.header('Cache-Control', 's-maxage=43200, stale-while-revalidate=300');

    const result = await zoro.fetchInfo(animeId);
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

  fastify.get('/episodes/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const animeId = String(request.params.animeId);

    reply.header('Cache-Control', 's-maxage=7200, stale-while-revalidate=300');

    const result = await zoro.fetchEpisodes(animeId);

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

  fastify.get('/servers/:episodeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const episodeId = String(request.params.episodeId);

    reply.header('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');

    const result = await zoro.fetchEpisodeServers(episodeId);

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
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';
      const server = request.query.server || 'hd-1';

      const newserver = toZoroServers(server);
      const newcategory = toCategory(category);

      reply.header('Cache-Control', 's-maxage=300, stale-while-revalidate=180');

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
