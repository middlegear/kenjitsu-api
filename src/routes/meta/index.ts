import { FastifyInstance } from 'fastify';
import AnilistRoutes from './anilist.js';
import JikanRoutes from './jikan.js';

export default async function MetaRoutes(fastify: FastifyInstance) {
  fastify.register(AnilistRoutes, { prefix: '/anilist' });
  fastify.register(JikanRoutes, { prefix: '/jikan' });
}
