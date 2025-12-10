/**
 * ============================================================================
 * Express Server - TeamPlaner Backend
 * ============================================================================
 * 
 * Integriert die 3-Säulen-Architektur:
 * - PostgreSQL: Single Source of Truth
 * - Redis: Session & Cache
 * - SpiceDB: Authorization
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
require('dotenv').config();

const { getRedisService } = require('./services/redis.service');
const { getSpiceDBService } = require('./services/spicedb.service');
const { getAuthService } = require('./services/auth.service');

// Routes
const authRoutes = require('./routes/auth.routes');
const teamRoutes = require('./routes/team.routes');
const projectRoutes = require('./routes/project.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet()); // Security Headers
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined')); // Logging

// ============================================================================
// DATABASE CONNECTIONS
// ============================================================================

const pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'teamplaner',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// PostgreSQL Connection Test
pgPool.on('connect', () => {
    console.log('PostgreSQL: Connected');
});

pgPool.on('error', (err) => {
    console.error('PostgreSQL error:', err);
    process.exit(-1);
});

// ============================================================================
// STARTUP
// ============================================================================

async function startServer() {
    try {
        console.log('='.repeat(70));
        console.log('Starting TeamPlaner Backend...');
        console.log('='.repeat(70));

        // 1. Test PostgreSQL Connection
        await pgPool.query('SELECT NOW()');
        console.log('✓ PostgreSQL: Connection successful');

        // 2. Connect to Redis
        const redisService = getRedisService();
        await redisService.connect();
        const redisPing = await redisService.ping();
        if (redisPing) {
            console.log('✓ Redis: Connection successful');
        } else {
            throw new Error('Redis ping failed');
        }

        // 3. Connect to SpiceDB
        const spiceDBService = getSpiceDBService();
        await spiceDBService.connect();
        console.log('✓ SpiceDB: Connection successful');

        // 4. Initialize Auth Service
        const authService = getAuthService();
        await authService.initialize(pgPool);
        console.log('✓ Auth Service: Initialized');

        console.log('='.repeat(70));

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// ============================================================================
// ROUTES
// ============================================================================

// Health Check Endpoint
app.get('/health', async (req, res) => {
    try {
        const redisService = getRedisService();
        const spiceDBService = getSpiceDBService();

        const checks = {
            server: 'ok',
            postgres: 'checking',
            redis: 'checking',
            spicedb: 'checking'
        };

        // PostgreSQL Check
        try {
            await pgPool.query('SELECT 1');
            checks.postgres = 'ok';
        } catch (error) {
            checks.postgres = 'error';
        }

        // Redis Check
        try {
            const ping = await redisService.ping();
            checks.redis = ping ? 'ok' : 'error';
        } catch (error) {
            checks.redis = 'error';
        }

        // SpiceDB Check
        try {
            const healthy = await spiceDBService.healthCheck();
            checks.spicedb = healthy ? 'ok' : 'error';
        } catch (error) {
            checks.spicedb = 'error';
        }

        const allHealthy = Object.values(checks).every(v => v === 'ok');
        const statusCode = allHealthy ? 200 : 503;

        res.status(statusCode).json({
            status: allHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            checks
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/settings', settingsRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'The requested endpoint does not exist'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    res.status(err.statusCode || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
        // Close HTTP Server
        server.close(() => {
            console.log('HTTP server closed');
        });

        // Close Database Connections
        const redisService = getRedisService();
        await redisService.disconnect();
        console.log('Redis disconnected');

        await pgPool.end();
        console.log('PostgreSQL disconnected');

        console.log('Shutdown complete');
        process.exit(0);

    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================================
// START SERVER
// ============================================================================

let server;

startServer().then(() => {
    server = app.listen(PORT, () => {
        console.log('='.repeat(70));
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   Health Check: http://localhost:${PORT}/health`);
        console.log('='.repeat(70));
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

module.exports = app;
