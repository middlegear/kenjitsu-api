import { TheMovieDatabase } from '@middlegear/hakai-extensions';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { FastifyParams, FastifyQuery } from '../../utils/types.js';
import { SearchType, toSearchType, toTimeWindow } from '../../utils/utils.js';

const tmdb = new TheMovieDatabase();

export default async function TheMovieDatabaseRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Welcome to The TheMovieDatabase provider' });
  });

  fastify.get('/search', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const q = String(request.query.q);
    const page = Number(request.query.page) || 1;
    const type = String(request.query.type);
    const validateSearchType = toSearchType(type);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    let result;
    validateSearchType === SearchType.Movie
      ? (result = await tmdb.searchMovies(q, page))
      : (result = await tmdb.searchShows(q, page));

    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get(
    '/info/:mediaId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const mediaId = Number(request.params.mediaId);
      const type = String(request.query.type);
      const validateType = toSearchType(type);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      let result;
      validateType === SearchType.Movie
        ? (result = await tmdb.fetchMovieInfo(mediaId))
        : (result = await tmdb.fetchShowInfo(mediaId));

      if ('error' in result && 'seasons' in result) {
        return reply.status(500).send({
          data: result.data,
          seasons: result.seasons,
          error: result.error,
        });
      } else if ('error' in result) {
        return reply.status(500).send({
          data: result.data,
          error: result.error,
        });
      }

      if ('seasons' in result && validateType === SearchType.TvShow) {
        return reply.send({
          data: result.data,
          seasons: result.seasons,
        });
      } else
        return reply.status(200).send({
          data: result.data,
        });
    },
  );

  fastify.get('/trending', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const type = String(request.query.type);
    const page = Number(request.query.page) || 1;
    const timeWindow = request.query.timeWindow || 'week';
    const validateType = toSearchType(type);
    const validateWindow = toTimeWindow(timeWindow);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    let result;
    validateType === SearchType.Movie
      ? (result = await tmdb.fetchTrendingMovies(validateWindow, page))
      : (result = await tmdb.fetchTrendingTv(validateWindow, page));

    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get('/popular', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const type = String(request.query.type);
    const page = Number(request.query.page) || 1;
    const validateType = toSearchType(type);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    let result;
    validateType === SearchType.Movie
      ? (result = await tmdb.fetchPopularMovies(page))
      : (result = await tmdb.fetchPopularTv(page));

    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get('/top', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;
    const type = String(request.query.type);
    const validateType = toSearchType(type);

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);
    let result;
    validateType === SearchType.Movie
      ? (result = await tmdb.fetchTopMovies(page))
      : (result = await tmdb.fetchTopShows(page));

    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get(
    '/get-provider/:tmdbId',
    async (request: FastifyRequest<{ Querystring: FastifyQuery; Params: FastifyParams }>, reply: FastifyReply) => {
      // const provider = String(request.query.provider) currently its only flixHQ will add more in the future
      const tmdbId = Number(request.params.tmdbId);
      const type = String(request.query.type);
      const validateType = toSearchType(type);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      let result;
      validateType === SearchType.Movie
        ? (result = await tmdb.fetchMovieProviderId(tmdbId))
        : (result = await tmdb.fetchTvProviderId(tmdbId));

      if ('error' in result && 'seasons' in result) {
        return reply.status(500).send({
          data: result.data,
          seasons: result.seasons,
          providerResult: result.providerResult,
          error: result.error,
        });
      } else if ('error' in result) {
        return reply.status(500).send({
          data: result.data,
          providerResult: result.providerResult,
          error: result.error,
        });
      }

      if ('seasons' in result && validateType === SearchType.TvShow) {
        return reply.send({
          data: result.data,
          seasons: result.seasons,
          providerResult: result.providerResult,
        });
      } else
        return reply.status(200).send({
          data: result.data,
          providerResult: result.providerResult,
        });
    },
  );

  fastify.get('/airing-tv', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const result = await tmdb.fetchAiringTv(page);

    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get(
    '/episodes/:tmdbId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const tmdbId = Number(request.params.tmdbId);
      const season = Number(request.query.season);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const result = await tmdb.fetchTvEpisodes(tmdbId, season);
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

  fastify.get(
    '/episode-info/:tmdbId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const tmdbId = Number(request.params.tmdbId);
      const season = Number(request.query.season);
      const episodeNumber = Number(request.query.episode);

      reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

      const result = await tmdb.fetchEpisodeInfo(tmdbId, season, episodeNumber);
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

  fastify.get('/releasing', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const result = await tmdb.fetchReleasingMovies(page);

    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get('/upcoming', async (request: FastifyRequest<{ Querystring: FastifyQuery }>, reply: FastifyReply) => {
    const page = Number(request.query.page) || 1;

    reply.header('Cache-Control', `s-maxage=${24 * 60 * 60}, stale-while-revalidate=300`);

    const result = await tmdb.fetchUpcomingMovies(page);

    if ('error' in result) {
      return reply.status(500).send({
        hasNextPage: result.hasNextPage,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        data: result.data,
        error: result.error,
      });
    }

    return reply.status(200).send({
      hasNextPage: result.hasNextPage,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
      data: result.data,
    });
  });

  fastify.get(
    '/watch/:tmdbId',
    async (request: FastifyRequest<{ Params: FastifyParams; Querystring: FastifyQuery }>, reply: FastifyReply) => {
      const tmdbId = Number(request.params.tmdbId);
      const seasonNumber = Number(request.query.season);
      const episodeNumber = Number(request.query.episode);

      reply.header('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

      let result;
      seasonNumber && episodeNumber
        ? (result = await tmdb.fetchTvSources(tmdbId, seasonNumber, episodeNumber))
        : (result = await tmdb.fetchMovieSources(tmdbId));

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
