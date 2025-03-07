import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import MetaRoutes from './routes/meta/index.js';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname,reqId',
        colorize: true,
      },
    },
  },
  disableRequestLogging: true, // This stops Fastify from logging incoming requests
});

// Extend FastifyRequest to include `startTime`
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: [number, number];
  }
}

fastify.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
  request.startTime = process.hrtime();
  request.log.info(`Incoming: ${request.method} ${request.url} | IP: ${request.ip}`);
  done();
});

fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
  if (request.startTime) {
    const diff = process.hrtime(request.startTime);
    const responseTimeMs = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2); // Convert to ms

    request.log.info(
      `Completed: ${request.method} ${request.url} | ${reply.statusCode} | ${responseTimeMs}ms | IP: ${request.ip}`,
    );
  }
  done();
});

fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
  reply.status(200).send({ message: 'Avalaible routes are /anime & /meta' }); // remeber to add html picture for the root api
});

//api/meta route
fastify.register(MetaRoutes, { prefix: 'api/meta' });

//function to start the server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOSTNAME || '0.0.0.0';

    if (isNaN(port)) {
      fastify.log.error('Invalid PORT environment variable');
      process.exit(1);
    }

    await fastify.listen({ host, port });
  } catch (err) {
    fastify.log.error(`Server startup error: ${err}`);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  fastify.log.info('Shutting down server...');
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

start();
