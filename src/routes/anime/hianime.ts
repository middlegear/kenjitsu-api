import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { HiAnime, type HIGenre, type IAnimeCategory } from '@middlegear/hakai-extensions';

import { IAnimeCategoryArr, type FastifyParams, type FastifyQuery } from '../../utils/types.js';

const zoro = new HiAnime();

export default async function HianimeRoutes(fastify: FastifyInstance) {
  //

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${178 * 60 * 60}, stale-while-revalidate=300`);

    const result = await zoro.fetchHome();

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');

    if (!q.length) {
      return reply.status(400).send({ error: 'Query string cannot be empty' });
    }
    if (q.length > 1000) {
      return reply.status(400).send({ error: 'Query too long' });
    }

    const page = Number(request.query.page) || 1;

    reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300');

    const result = await zoro.search(q, page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/suggestions', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    let q = request.query.q?.trim() ?? '';
    q = decodeURIComponent(q);
    q = q.replace(/[^\w\s\-_.]/g, '');

    if (!q.length) {
      return reply.status(400).send({ error: 'Query string cannot be empty' });
    }
    if (q.length > 100) {
      return reply.status(400).send({ error: 'Query too long' });
    }

    reply.header('Cache-Control', 's-maxage=86400, stale-while-revalidate=300');

    const result = await zoro.searchSuggestions(q);
    if ('error' in result) {
      return reply.status(500).send(result);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/info/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const animeId = String(request.params.animeId);

    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const result = await zoro.fetchAnimeInfo(animeId);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const result = await zoro.fetchTopAiring(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/favourites', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const result = await zoro.fetchMostFavourites(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/most-popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const result = await zoro.fetchMostPopular(page);
    if ('error' in result) {
      return reply.status(500).send(result);
    }
    return reply.status(200).send(result);
  });

  fastify.get('/recently-completed', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const result = await zoro.fetchRecentlyCompleted(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/recently-updated', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const result = await zoro.fetchRecentlyUpdated(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/recently-added', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const result = await zoro.fetchRecentlyAdded(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get(
    '/az-list/:sort',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

      const page = Number(request.query.page) || 1;
      const sort = String(request.params.sort);

      const result = await zoro.fetchAtoZList(sort, page);

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    },
  );

  fastify.get('/subbed', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const result = await zoro.fetchSubbedAnime(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/dubbed', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${148 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;

    const result = await zoro.fetchDubbedAnime(page);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/category', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${72 * 60 * 60}, stale-while-revalidate=300`); // check if nezha movie is still first from 29/08 at 0013Hrs or increase cache value

    const page = Number(request.query.page) || 1;
    const format = (request.query.format as IAnimeCategory) || 'TV';

    if (!format) {
      return reply.status(400).send({
        error: "Missing required query parameter: 'format'.",
      });
    }
    if (!IAnimeCategoryArr.includes(format)) {
      return reply.status(400).send({
        error: `Invalid format: '${format}'. Expected one of ${IAnimeCategoryArr.join(', ')}.`,
      });
    }

    const result = await zoro.fetchAnimeCategory(format, page);
    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get(
    '/genre/:genre',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const page = Number(request.query.page) || 1;
      const genre = request.params.genre as HIGenre;
      if (!genre) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'genre'.",
        });
      }

      const result = await zoro.fetchGenre(genre, page);

      if ('error' in result) {
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    },
  );
  fastify.get('/episodes/:animeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const animeId = String(request.params.animeId);

    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    if (!animeId) {
      return reply.status(400).send({
        error: "Missing required path parameter: 'animeId'.",
      });
    }
    const result = await zoro.fetchEpisodes(animeId);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get('/servers/:episodeId', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    const episodeId = String(request.params.episodeId);

    reply.header('Cache-Control', `s-maxage=${12 * 60 * 60}, stale-while-revalidate=300`);

    if (!episodeId) {
      return reply.status(400).send({
        error: "Missing required path parameter: 'episodeId'.",
      });
    }
    const result = await zoro.fetchServers(episodeId);

    if ('error' in result) {
      return reply.status(500).send(result);
    }

    return reply.status(200).send(result);
  });

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', 's-maxage=600, stale-while-revalidate=60');

      const episodeId = String(request.params.episodeId);
      const category = (request.query.category as 'sub' | 'dub' | 'raw') || 'sub';
      // const server = (request.query.server as 'hd-1' | 'hd-2' | 'hd-3') || 'hd-2';

      if (!episodeId) {
        return reply.status(400).send({
          error: "Missing required path parameter: 'episodeId'.",
        });
      }
      if (!['sub', 'dub', 'raw'].includes(category)) {
        return reply.status(400).send({
          error: `Invalid category picked: '${category}'. Expected one of 'sub','dub','raw'.`,
        });
      }
      // if (!['hd-1', 'hd-2', 'hd-3'].includes(server)) {
      //   return reply.status(400).send({
      //     error: `Invalid  streaming server selected: '${server}'. Expected one of 'hd-1', 'hd-2', 'hd-3'.`,
      //   });
      // }
      const result = await zoro.fetchSources(episodeId, 'hd-2', category);

      if ('error' in result) {
        return reply.status(500).send(result);
      }
      return reply.status(200).send(result);
    },
  );
}
