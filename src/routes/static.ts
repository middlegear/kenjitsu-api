import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirRelative = '../../public';

export default async function StaticRoutes(fastify: FastifyInstance) {
  const publicDir = path.join(__dirname, publicDirRelative);

  await fastify.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    setHeaders: (res, filePath) => {
      res.setHeader('Cache-Control', 's-maxage=31536000, immutable');
    },
  });

  fastify.get('/', async (request, reply) => {
    return reply.sendFile('index.html');
  });

  fastify.get('/favicon.ico', async (request, reply: FastifyReply) => {
    return reply.redirect('/favicon.png', 301);
  });
}
