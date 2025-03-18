import Fastify, { FastifyRequest, FastifyReply } from 'fastify';

/// local dev dont touch
const fastifyLogger = Fastify({
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
  disableRequestLogging: true,
});
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: [number, number];
  }
}

fastifyLogger.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
  request.startTime = process.hrtime();
  request.log.info(`Incoming: ${request.method} ${request.url} | IP: ${request.ip}`);
  done();
});

fastifyLogger.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
  if (request.startTime) {
    const diff = process.hrtime(request.startTime);
    const responseTimeMs = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2); // Convert to ms

    request.log.info(
      `Completed: ${request.method} ${request.url} | ${reply.statusCode} | ${responseTimeMs}ms | IP: ${request.ip}`,
    );
  }
  done();
});

export default fastifyLogger;
