import fastifyCors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

export default async function Cors(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    origin: '*',
    methods: 'GET',
  });
}
