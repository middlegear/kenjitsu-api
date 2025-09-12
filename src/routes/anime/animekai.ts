import { Animekai } from '@middlegear/hakai-extensions';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AnimekaiInfo, FastifyParams, FastifyQuery } from '../../utils/types.js';
import { toAKGenres, toCategory, toFormatAnilist, toFormatHianime } from '../../utils/utils.js';
import { redisGetCache, redisSetCache } from '../../middleware/cache.js';

const animekai = new Animekai();

export default async function AnimekaiRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');

    const result = await animekai.fetchHome();

    if ('error' in result) {
      return reply.status(500).send({
        error: result.error,
        data: result.data,
        trending: result.trending,
        recentlyCompleted: result.recentlyCompleted,
        recentlyAdded: result.recentlyAdded,
        recentlyUpdated: result.recentlyUpdated,
      });
    }

    return reply.status(200).send({
      data: result.data,
      recentlyAdded: result.recentlyAdded,
      trending: result.trending,
      recentlyCompleted: result.recentlyCompleted,
      recentlyUpdated: result.recentlyUpdated,
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
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        totalResults: result.totalResults,
        error: result.error,
        data: result.data,
      });
    }
    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      lastPage: result.lastPage,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get('/recently-updated', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    const category = String(request.query.format) || 'TV';
    const format = toFormatAnilist(category);
    const result = await animekai.fetchRecentlyUpdated(format, page);

    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        totalResults: result.totalResults,
        error: result.error,
        data: result.data,
      });
    }
    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      lastPage: result.lastPage,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get('/recently-added', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const category = String(request.query.format) || 'TV';
    const format = toFormatAnilist(category);
    const page = Number(request.query.page) || 1;

    const result = await animekai.fetchRecentlyAdded(format, page);
    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        totalResults: result.totalResults,
        error: result.error,
        data: result.data,
      });
    }
    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      totalResults: result.totalResults,
      lastPage: result.lastPage,
      data: result.data,
    });
  });

  fastify.get('/recently-completed', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    reply.header('Cache-Control', `s-maxage=${0.5 * 60 * 60}, stale-while-revalidate=300`);

    const category = String(request.query.format) || 'TV';
    const format = toFormatAnilist(category);
    const page = Number(request.query.page) || 1;

    const result = await animekai.fetchRecentlyCompleted(format, page);
    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        totalResults: result.totalResults,
        error: result.error,
        data: result.data,
      });
    }
    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      totalResults: result.totalResults,
      lastPage: result.lastPage,
      data: result.data,
    });
  });

  fastify.get('/category', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    //
    reply.header('Cache-Control', `s-maxage=${72 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    const format = request.query.format || 'TV';
    const newformat = toFormatHianime(format);

    const result = await animekai.fetchAnimeCategory(newformat, page);
    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        totalResults: result.totalResults,
        error: result.error,
        data: result.data,
      });
    }
    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      lastPage: result.lastPage,
      totalResults: result.totalResults,

      data: result.data,
    });
  });

  fastify.get('/top-airing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    //
    reply.header('Cache-Control', `s-maxage=${72 * 60 * 60}, stale-while-revalidate=300`);

    const page = Number(request.query.page) || 1;
    const format = request.query.format || 'TV';
    const newformat = toFormatAnilist(format);

    const result = await animekai.fetchTopAiring(newformat, page);
    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        totalResults: result.totalResults,
        error: result.error,
        data: result.data,
      });
    }
    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      lastPage: result.lastPage,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get(
    '/genre/:genre',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const page = Number(request.query.page) || 1;
      const genre = String(request.params.genre);
      const validGenre = toAKGenres(genre);
      const result = await animekai.fetchGenres(validGenre, page);
      if ('error' in result) {
        return reply.status(500).send({
          hasNextPage: result.hasNextPage,
          currentPage: result.currentPage,
          lastPage: result.lastPage,
          totalResults: result.totalResults,
          error: result.error,
          data: result.data,
        });
      }
      return reply.status(200).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        totalResults: result.totalResults,
        data: result.data,
      });
    },
  );

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
    status === 'completed' ? (timecached = 2000) : (timecached = 1);

    const cachedData = (await redisGetCache(cacheKey)) as AnimekaiInfo;

    if (cachedData) {
      return reply.status(200).send({
        data: result.data,
        relatedSeasons: result.relatedSeasons,
        recommendedAnime: result.recommendedAnime,
        relatedAnime: result.relatedAnime,
        providerEpisodes: result.providerEpisodes,
      });
    }

    if (result.data && result.providerEpisodes && result.providerEpisodes.length > 0) {
      const cacheableData = {
        data: result.data,
        relatedSeasons: result.relatedSeasons,
        recommendedAnime: result.recommendedAnime,
        relatedAnime: result.relatedAnime,
        providerEpisodes: result.providerEpisodes,
      };
      await redisSetCache(cacheKey, cacheableData, timecached);
    }

    return reply.status(200).send({
      data: result.data,
      relatedSeasons: result.relatedSeasons,
      recommendedAnime: result.recommendedAnime,
      relatedAnime: result.relatedAnime,
      providerEpisodes: result.providerEpisodes,
    });
  });

  fastify.get(
    '/servers/:episodeId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      const episodeId = String(request.params.episodeId);
      const category = request.query.category || 'sub';

      reply.header('Cache-Control', 's-maxage=300, stale-while-revalidate=180');

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
