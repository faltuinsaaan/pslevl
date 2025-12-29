import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const PORT = parseInt(process.env.PORT || '3000', 10);

const fastify = Fastify({ logger: true });

// Manual CORS headers
fastify.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
        reply.status(204).send();
    }
});

// Mock DB (replace with real DB in production)
const users = [
    { id: '1', username: 'demo', password: 'password' }
];

// Health check endpoint
fastify.get('/health', async () => {
    return {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };
});

// Auth routes
fastify.post('/auth/login', async (request, reply) => {
    const { username, password } = request.body as any;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: 86400 } // 24 hours in seconds
        );
        fastify.log.info({ username }, 'User logged in');
        return { token, user: { id: user.id, username: user.username } };
    } else {
        fastify.log.warn({ username }, 'Failed login attempt');
        reply.code(401);
        return { error: 'Invalid credentials' };
    }
});

fastify.get('/auth/verify', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        reply.code(401);
        return { error: 'No token' };
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, user: decoded };
    } catch (err) {
        reply.code(401);
        return { error: 'Invalid token' };
    }
});

// Start server
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        fastify.log.info({ port: PORT, env: NODE_ENV }, 'Session service started');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
    fastify.log.info({ signal }, 'Shutdown signal received');
    try {
        await fastify.close();
        fastify.log.info('Server closed');
        process.exit(0);
    } catch (err) {
        fastify.log.error(err, 'Error during shutdown');
        process.exit(1);
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
