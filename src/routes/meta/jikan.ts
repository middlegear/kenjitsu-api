import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AnimeProvider, Format, Jikan, Seasons } from 'hakai-extensions';

const jikan = new Jikan();

export default async function JikanRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Welcome to Jikan metadata provider',
    });
  });

  // api/meta/jikan/search?q=string&page=number&perPage=number
  fastify.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const { q } = request.query as { q: string };
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };
    const data = await jikan.search(q, page, perPage);
    return reply.send({ data });
  });

  // api/meta/jikan/info/:id
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const data = await jikan.fetchInfo(id);
    return reply.send({ data });
  });

  // api/meta/jikan/top-airing?page=number&perPage=number&format=format
  fastify.get('/top-airing', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };
    const { format } = request.query as { format: Format };
    const data = await jikan.fetchTopAiring(page, perPage, format);
    return reply.send({ data });
  });

  //api/meta/jikan/most-popular?page=number&perPage=number&format=format
  fastify.get('/most-popular', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };
    const { format } = request.query as { format: Format };
    const data = await jikan.fetchMostPopular(page, perPage, format);
    return reply.send({ data });
  });

  //api/meta/jikan/upcoming?page=number&perPage=number
  fastify.get('/upcoming', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };

    const data = await jikan.fetchTopUpcoming(page, perPage);
    return reply.send({ data });
  });

  //api/meta/jikan/movies?page=number&perPage=number
  fastify.get('/movies', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };
    const data = await jikan.fetchTopMovies(page, perPage);
    return reply.send({ data });
  });

  //api/meta/jikan/seasons/:season/:year?page=number&perPage=number
  fastify.get('/seasons/:season/:year', async (request: FastifyRequest, reply: FastifyReply) => {
    const { season } = request.params as { season: Seasons };
    const { year } = request.params as { year: number };
    const { format } = request.query as { format: Format };
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };

    const data = await jikan.fetchSeason(season, year, format, page, perPage);
    return reply.send({ data });
  });

  //api/meta/jikan/current-season?page=number&perPage=number&format=string
  fastify.get('/current-season', async (request: FastifyRequest, reply: FastifyReply) => {
    const { format } = request.query as { format: Format };
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };

    const data = await jikan.fetchCurrentSeason(page, perPage, format);
    return reply.send({ data });
  });

  //api/meta/jikan/next-season?page=number&perPage=number&format=string
  fastify.get('/next-season', async (request: FastifyRequest, reply: FastifyReply) => {
    const { format } = request.query as { format: Format };
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };

    const data = await jikan.fetchNextSeason(page, perPage, format);
    return reply.send({ data });
  });

  //api/meta/jikan/characters/:id
  fastify.get('/characters/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const data = await jikan.fetchAnimeCharacters(id);

    return reply.send({ data });
  });

  //api/meta/jikan/mal-episodes/:id?page=number
  fastify.get('/mal-episodes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const { page } = request.query as { page: number };

    const data = await jikan.fetchMalEpisodes(id, page);
    return reply.send({ data });
  });

  //api/meta/jikan/mal-episode-info/:id/:episodeNumber
  fastify.get('/mal-episode-info/:id/:episodeNumber', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const { episodeNumber } = request.params as { episodeNumber: number };

    const data = await jikan.fetchMalEpisodeInfo(id, episodeNumber);
    return reply.send({ data });
  });

  //api/meta/anilist/get-provider/:id/:animeprovider
  fastify.get('/get-provider/:id/:animeprovider', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const { animeprovider } = request.params as { animeprovider: AnimeProvider };

    const data = await jikan.fetchProviderAnimeId(id, animeprovider);
    return reply.send({ data });
  });

  //api/meta/anilist/provider-episodes/:id/:animeprovider
  fastify.get('/provider-episodes/:id/:animeprovider', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const { animeprovider } = request.params as { animeprovider: AnimeProvider };

    const data = await jikan.fetchAnimeProviderEpisodes(id, animeprovider);
    return reply.send({ data });
  });
}
