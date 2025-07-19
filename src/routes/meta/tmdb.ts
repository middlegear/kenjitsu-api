import { TheMovieDatabase } from 'hakai-extensions';
import { FastifyRequest, FastifyReply } from 'fastify';
import { FastifyInstance } from 'fastify';
import { FastifyQuery } from '../../utils/types';

const tmdb = new TheMovieDatabase();

export async function TheMovieDatabaseRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Welcome to The TheMovieDatabase provider' });
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const q = String(request.query.q);

    const result = await tmdb.searchShows(q);
  });
}
