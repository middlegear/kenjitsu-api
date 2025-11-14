import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AllAnime } from '@middlegear/kenjitsu-extensions';
import type { AllAnimeServers, FastifyParams, FastifyQuery } from '../../utils/types.js';

const allanime = new AllAnime();

export default async function AllAnimeRoutes(fastify: FastifyInstance) {
  fastify.get('/anime/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=300');

    const q = request.query.q;
    const page = request.query.page;

    if (!q) return reply.status(400).send({ error: "Missing required query param: 'q'" });
    if (q.length > 1000) return reply.status(400).send({ error: 'Query string too long' });

    try {
      const result = await allanime.search(q);
      if ('error' in result) {
        request.log.error({ result, q }, `External API Error`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred while querying search results`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });

  fastify.get('/anime/:id/episodes', async (request: FastifyRequest<{ Params: FastifyParams }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `public, s-maxage=${1 * 60 * 60}, stale-while-revalidate=300`);

    const id = request.params.id;
    if (!id) {
      return reply.status(400).send({ error: 'Missing required path paramater: id' });
    }

    try {
      const result = await allanime.fetchEpisodes(id);
      if ('error' in result) {
        request.log.error({ result, id }, `External API Error`);
        return reply.status(500).send(result);
      }

      return reply.status(200).send(result);
    } catch (error) {
      request.log.error({ error: error }, `Internal runtime error occurred while fetching episodes`);
      return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
    }
  });
  fastify.get(
    '/episode/:id/servers',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `public, s-maxage=${6 * 60 * 60}, stale-while-revalidate=300`);

      const id = request.params.id;
      const version = (request.query.version as 'sub' | 'dub' | 'raw') || 'sub';
      if (!id) {
        return reply.status(400).send({ error: 'Missing required path paramater: id' });
      }

      if (!['sub', 'dub', 'raw'].includes(version)) {
        return reply.status(400).send({
          error: `Invalid version picked: '${version}'. Expected one of 'sub','dub','raw'.`,
        });
      }
      try {
        const result = await allanime.fetchServers(id);
        if ('error' in result) {
          request.log.error({ result, id }, `External API Error`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching episodes`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );
  fastify.get(
    '/sources/:episodeId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `public, s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

      const episodeId = request.params.episodeId;
      const version = (request.query.version as 'sub' | 'dub' | 'raw') || 'sub';
      const allowedServers = [
        'okru',
        'internal-default-hls',
        'internal-ak',
        'internal-s-mp4',
        'internal-yt-mp4',
        'mp4upload',
      ] as const;
      const server = (request.query.server as AllAnimeServers) || 'okru';

      if (!episodeId) {
        return reply.status(400).send({
          error: `Missing required path paramater: 'episodeId'`,
        });
      }

      if (!allowedServers.includes(server)) {
        return reply.status(400).send({
          error: `Invalid server '${server}'. Expected one of: ${allowedServers.join(', ')}`,
        });
      }

      if (!['sub', 'dub', 'raw'].includes(version)) {
        return reply.status(400).send({
          error: `Invalid version picked: '${version}'. Expected one of 'sub','dub','raw'.`,
        });
      }
      try {
        const result = await allanime.fetchSources(episodeId, server, version);
        if ('error' in result) {
          request.log.error({ result, episodeId, version }, `External API Error`);
          return reply.status(500).send(result);
        }

        return reply.status(200).send(result);
      } catch (error) {
        request.log.error({ error: error }, `Internal runtime error occurred while fetching sources`);
        return reply.status(500).send({ error: `Internal server error occurred: ${error}` });
      }
    },
  );
}
