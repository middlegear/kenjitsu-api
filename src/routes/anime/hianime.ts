import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HiAnime, HiAnimeServers, SubOrDub } from 'hakai-extensions';
import { toZoroServers, toCategory } from '../../utils/normalize.js';

const zoro = new HiAnime();

export default async function HianimeRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Welcome to Hianime Provider',
    });
  });

  //api/anime/hianime/search?q=''&page=number
  fastify.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const { q } = request.query as { q: string };
    const { page } = request.query as { page: number };
    const data = await zoro.search(q, page);
    return reply.send({ data });
  });

  //api/anime/hianime/info/:id
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = await zoro.fetchInfo(id);
    return reply.send({ data });
  });

  //api/anime/hianime/episodes/:id
  fastify.get('/episodes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = await zoro.fetchEpisodes(id);
    return reply.send({ data });
  });

  //api/anime/hianime/servers/:id
  fastify.get('/servers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = await zoro.fetchEpisodeServers(id);
    return reply.send({ data });
  });

  fastify.get('/sources/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { category } = request.query as { category: SubOrDub };
    const { server } = request.query as { server: HiAnimeServers };

    const newserver = toZoroServers(server);
    const newcategory = toCategory(category);

    const data = await zoro.fetchSources(id, newserver, newcategory);
    return reply.send({ data });
  });
}
