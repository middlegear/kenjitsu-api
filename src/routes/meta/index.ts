import { FastifyInstance } from 'fastify';
import AnilistRoutes from './anilist.js';

export default async function MetaRoutes(fastify: FastifyInstance) {
  fastify.register(AnilistRoutes, { prefix: '/anilist' });
}
