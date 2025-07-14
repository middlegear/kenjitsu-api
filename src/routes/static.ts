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
    reply.header('Cache-Control', 's-maxage=31536000, immutable');

    return reply.sendFile('index.html');
  });

  fastify.get('/favicon.ico', async (request, reply: FastifyReply) => {
    reply.header('Cache-Control', 's-maxage=31536000, immutable');

    return reply.redirect('/favicon.png', 301);
  });
}

export async function RouteNotFound(request: FastifyRequest, reply: FastifyReply) {
  try {
    const notFoundHtmlPath = path.join(__dirname, publicDirRelative, '404.html');
    const notFoundHtml = await fs.readFile(notFoundHtmlPath, 'utf8');
    reply.header('Cache-Control', 's-maxage=31536000, immutable');

    reply.code(404).header('Content-Type', 'text/html').header('Cache-Control', 'no-store').send(notFoundHtml);
  } catch (err) {
    console.error('Error serving 404 page:', err);
    reply.code(500).send('Internal Server Error');
  }
}
