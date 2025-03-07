import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Anilist, AnimeProvider, Format, Seasons } from 'hakai-extensions';
import { toAnilistSeasons, toFormatAnilist } from '../../utils/normalize.js';
const anilist = new Anilist();
interface SearchQuery {
  q: string;
  page: number;
  perPage: number;
}

///pagination needs to be possible(page=)
export default async function AnilistRoutes(fastify: FastifyInstance) {
  // api/meta/anilist
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Welcome to Anilist Metadata provider' });
  });

  // api/meta/anilist?q=yoursearchquery&page=number&perpage=number
  fastify.get('/search', async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
    const { q } = request.query;
    const { page } = request.query;
    const { perPage } = request.query;
    const data = await anilist.search(q, page, perPage);
    return reply.send({ data });
  });

  // api/meta/anilist/info/:id
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const data = await anilist.fetchInfo(id);

    return reply.send({ data });
  });

  // api/meta/anilist/top-airing?page=number&perPage=number
  fastify.get('/top-airing', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };
    const data = await anilist.fetchAiring(page, perPage);
    return reply.send({ data });
  });

  // api/meta/anilist/most-popular?format=string&page=number&perPage=number
  fastify.get('/most-popular', async (request: FastifyRequest, reply: FastifyReply) => {
    const { format } = request.query as { format: Format };
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };
    const newformat = toFormatAnilist(format);
    const data = await anilist.fetchMostPopular(page, perPage, newformat);
    return reply.send({ data });
  });

  // api/meta/anilist/top-anime?format=string&page=number&perPage=number
  fastify.get('/top-anime', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };
    const { format } = request.query as { format: Format };
    const newformat = toFormatAnilist(format);
    const data = await anilist.fetchTopRatedAnime(page, perPage, newformat);
    return reply.send({ data });
  });

  // api/meta/anilist/upcoming
  fastify.get('/upcoming', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };
    const data = await anilist.fetchTopUpcoming(page, perPage);
    return reply.send({ data });
  });

  // api/meta/anilist/characters/:id
  fastify.get('/characters/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const data = await anilist.fetchCharacters(id);
    return reply.send({ data });
  });

  // api/meta/anilist/trending?page=number&perPage=number
  fastify.get('/trending', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };
    const data = await anilist.fetchTrending(page, perPage);
    return reply.send({ data });
  });

  // api/meta/anilist/related/:id
  fastify.get('/related/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };

    const data = await anilist.fetchRelatedAnime(id);
    return reply.send({ data });
  });

  // api/meta/anilist/seasons/:season/:year?format=string
  fastify.get('/seasons/:season/:year', async (request: FastifyRequest, reply: FastifyReply) => {
    const { season } = request.params as { season: Seasons };
    const { year } = request.params as { year: number };
    const { format } = request.query as { format: Format };
    const { page } = request.query as { page: number };
    const { perPage } = request.query as { perPage: number };

    const newformat = toFormatAnilist(format);
    const newseason = toAnilistSeasons(season);
    const data = await anilist.fetchSeasonalAnime(newseason, year, newformat, page, perPage);
    return reply.send({ data });
  });

  //api/meta/anilist/get-provider/:id/:animeprovider
  fastify.get('/get-provider/:id/:animeprovider', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const { animeprovider } = request.params as { animeprovider: AnimeProvider };

    const data = await anilist.fetchProviderAnimeId(id, animeprovider);
    return reply.send({ data });
  });

  //api/meta/anilist/provider-episodes/:id/:animeprovider
  fastify.get('/provider-episodes/:id/:animeprovider', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: number };
    const { animeprovider } = request.params as { animeprovider: AnimeProvider };

    const data = await anilist.fetchAnimeProviderEpisodes(id, animeprovider);
    return reply.send({ data });
  });
}
