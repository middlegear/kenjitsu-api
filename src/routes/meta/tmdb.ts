import { TheMovieDatabase } from 'hakai-extensions';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { FastifyQuery } from '../../utils/types.js';
import { SearchType, toSearchType } from '../../utils/normalize.js';

const tmdb = new TheMovieDatabase();

export async function TheMovieDatabaseRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Welcome to The TheMovieDatabase provider' });
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const q = String(request.query.q);
    const page = Number(request.query.page);
    const type = String(request.query.type);

    const validateSearchType = toSearchType(type);
    let result;
    validateSearchType === SearchType.Movie
      ? (result = await tmdb.searchMovies(q, page))
      : (result = await tmdb.searchShows(q, page));
  });
}
