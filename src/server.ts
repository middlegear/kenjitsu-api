import 'dotenv/config';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';

import StaticRoutes from './routes/static.js';
import AnimekaiRoutes from './routes/anime/animekai.js';
import HianimeRoutes from './routes/anime/hianime.js';
import AnilistRoutes from './routes/meta/anilist.js';
import JikanRoutes from './routes/meta/jikan.js';
import FlixHQRoutes from './routes/tv/flixhq.js';
import TheMovieDatabaseRoutes from './routes/meta/tmdb.js';
import TvMazeRoutes from './routes/meta/tvmaze.js';
import { ratelimitOptions, rateLimitPlugIn } from './config/ratelimit.js';
import fastifyCors, { corsOptions } from './config/cors.js';

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  enableLogs: true,
  sendDefaultPii: true,
  beforeSend: (event, hint) => {
    const req = (hint.originalException as any)?.request;

    if (req) {
      const forwarded = req.headers?.['x-forwarded-for'];
      const realIp = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip;

      event.request = {
        method: req.method,
        url: req.url,
        headers: req.headers,
      };

      event.user = {
        ip_address: realIp,
      };

      event.extra = {
        ...event.extra,
        forwardedFor: forwarded,
      };
    }

    return event;
  },
});

const app = Fastify({
  logger: { level: 'info' },
});

// Hook Sentry into Fastify error lifecycle
Sentry.setupFastifyErrorHandler(app);

async function FastifyApp() {
  app.register(rateLimitPlugIn, ratelimitOptions);
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.code(404).send({
      message: 'Stop go read the docs',
      url: 'https://hakai-documentation.vercel.app',
    });
  });

  await app.register(fastifyCors, corsOptions);

  await app.register(StaticRoutes);
  await app.register(AnilistRoutes, { prefix: '/api/anilist' });
  await app.register(JikanRoutes, { prefix: '/api/jikan' });
  await app.register(AnimekaiRoutes, { prefix: '/api/animekai' });
  await app.register(HianimeRoutes, { prefix: '/api/hianime' });
  await app.register(FlixHQRoutes, { prefix: '/api/flixhq' });
  await app.register(TvMazeRoutes, { prefix: '/api/tvmaze' });
  await app.register(TheMovieDatabaseRoutes, { prefix: '/api/tmdb' });

  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    if (isNaN(port)) {
      console.error('Invalid PORT environment variable');
      process.exit(1);
    }

    await app.listen({ host, port });
  } catch (err) {
    console.error(`Server startup error:`, err);
    process.exit(1);
  }
}

FastifyApp();

// Vercel handler
export default async function handler(req: FastifyRequest, res: FastifyReply) {
  await app.ready();
  app.server.emit('request', req, res);
}
