import type { FastifyInstance } from 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { TvMaze } from '@middlegear/hakai-extensions';
import type { FastifyParams, FastifyQuery } from '../../utils/types.js';

const tvmaze = new TvMaze();

export default async function TvMazeRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'Welcome to tvmaze provider' });
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const query = String(request.query.q);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const result = await tvmaze.search(query);

    if ('error' in result) {
      return reply.status(500).send({
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      data: result.data,
    });
  });

  fastify.get('/info/:tvmazeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const tvmazeId = Number(request.params.tvmazeId);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const result = await tvmaze.fetchInfo(tvmazeId);
    if ('error' in result) {
      return reply.status(500).send({
        data: result.data,
        episodes: result.episodes,
        cast: result.cast,
        error: result.error,
      });
    }

    return reply.status(200).send({
      data: result.data,
      episodes: result.episodes,
      cast: result.cast,
    });
  });

  fastify.get('/episodes/:tvmazeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const tvmazeId = Number(request.params.tvmazeId);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const result = await tvmaze.fetchEpisodes(tvmazeId);
    if ('error' in result) {
      return reply.status(500).send({
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      data: result.data,
    });
  });

  //// lookup?imdbId =''
  fastify.get('/lookup-imdb', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const imdbId = String(request.query.imdbId);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const result = await tvmaze.searchbyImDbId(imdbId);

    if ('error' in result) {
      return reply.status(500).send({
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      data: result.data,
    });
  });

  fastify.get(
    '/external-databases/:tvmazeId',
    async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
      const tvmazeId = Number(request.params.tvmazeId);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const result = await tvmaze.fetchExternal(tvmazeId);
      if ('error' in result) {
        return reply.status(500).send({
          data: result.data,
          error: result.error,
        });
      }

      return reply.status(200).send({
        data: result.data,
      });
    },
  );
}
