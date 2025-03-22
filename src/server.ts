import 'dotenv/config';

import { notFoundRateLimiter, ratelimitOptions, ratelimitPlugin } from './config/ratelimit.js';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { checkRedis } from './config/redis.js';
import StaticRoutes from './routes/static.js';
import AnimekaiRoutes from './routes/anime/animekai.js';
import HianimeRoutes from './routes/anime/hianime.js';
import AnilistRoutes from './routes/meta/anilist.js';
import JikanRoutes from './routes/meta/jikan.js';
import { purgeCache } from './middleware/cache.js';

const app = Fastify({ maxParamLength: 1000, logger: true });
async function FastifyApp() {
  //check redis
  await checkRedis();
  //CORS

  await app.register(fastifyCors, {
    origin: '*',
    methods: 'GET',
  });
  app.register(StaticRoutes);
  // Rate limiting
  await app.register(ratelimitPlugin, ratelimitOptions);
  app.setNotFoundHandler(
    {
      preHandler: app.rateLimit(notFoundRateLimiter),
    },
    (request, reply) => {
      reply.code(404).send({ message: 'NOT FOUND' });
    },
  );

  // API routes
  app.register(AnilistRoutes, { prefix: '/api/anilist' });
  app.register(JikanRoutes, { prefix: '/api/jikan' });
  app.register(AnimekaiRoutes, { prefix: '/api/animekai' });
  app.register(HianimeRoutes, { prefix: '/api/hianime' });

  // Server

  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOSTNAME || '0.0.0.0';

    if (isNaN(port)) {
      app.log.error('Invalid PORT environment variable');
      process.exit(1);
    }

    await app.listen({ host, port });
  } catch (err) {
    app.log.error(`Server startup error: ${err}`);
    process.exit(1);
  }
}
FastifyApp();

export default async function handler(req: any, res: any) {
  await app.ready();
  app.server.emit('request', req, res);
}
// purgeCache();
