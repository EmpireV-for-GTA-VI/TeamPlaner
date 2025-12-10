/**
 * ============================================================================
 * Redis Service - Der "Beschleuniger"
 * ============================================================================
 * 
 * Verantwortlichkeiten:
 * 1. Session Management (User-Sessions)
 * 2. Settings Caching (Write-Through Pattern)
 * 3. Rate Limiting
 * 4. Temporäre Daten
 * 
 * Pattern: Write-Through für Settings
 * - Bei Schreiben: Erst DB, dann Cache
 * - Bei Lesen: Erst Cache, bei Miss dann DB
 */

const redis = require('redis');
const { promisify } = require('util');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    /**
     * Initialisierung der Redis-Verbindung
     */
    async connect() {
        try {
            this.client = redis.createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                password: process.env.REDIS_PASSWORD,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            console.error('Redis: Max reconnection attempts reached');
                            return new Error('Max reconnection attempts reached');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            this.client.on('error', (err) => {
                console.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('Redis: Connected');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                console.log('Redis: Ready');
            });

            await this.client.connect();
        } catch (error) {
            console.error('Redis connection failed:', error);
            throw error;
        }
    }

    /**
     * Graceful Shutdown
     */
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            console.log('Redis: Disconnected');
        }
    }

    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================

    /**
     * Erstellt eine neue Session
     * @param {string} sessionId - Eindeutige Session-ID
     * @param {object} sessionData - Session-Daten (userId, email, etc.)
     * @param {number} ttl - Time to live in Sekunden (default: 24h)
     */
    async createSession(sessionId, sessionData, ttl = 86400) {
        const key = `session:${sessionId}`;
        const data = {
            ...sessionData,
            createdAt: Date.now(),
            lastAccessedAt: Date.now()
        };
        
        await this.client.setEx(key, ttl, JSON.stringify(data));
        console.log(`Session created: ${sessionId}`);
        return data;
    }

    /**
     * Holt Session-Daten und aktualisiert lastAccessedAt
     * @param {string} sessionId - Session-ID
     * @returns {object|null} Session-Daten oder null
     */
    async getSession(sessionId) {
        const key = `session:${sessionId}`;
        const data = await this.client.get(key);
        
        if (!data) {
            return null;
        }

        const session = JSON.parse(data);
        session.lastAccessedAt = Date.now();
        
        // TTL verlängern bei Zugriff (Sliding Expiration)
        const ttl = await this.client.ttl(key);
        if (ttl > 0) {
            await this.client.setEx(key, ttl, JSON.stringify(session));
        }

        return session;
    }

    /**
     * Aktualisiert Session-Daten
     * @param {string} sessionId - Session-ID
     * @param {object} updates - Zu aktualisierende Felder
     */
    async updateSession(sessionId, updates) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const updatedSession = {
            ...session,
            ...updates,
            lastAccessedAt: Date.now()
        };

        const key = `session:${sessionId}`;
        const ttl = await this.client.ttl(key);
        await this.client.setEx(key, ttl > 0 ? ttl : 86400, JSON.stringify(updatedSession));
        
        return updatedSession;
    }

    /**
     * Löscht eine Session (Logout)
     * @param {string} sessionId - Session-ID
     */
    async deleteSession(sessionId) {
        const key = `session:${sessionId}`;
        await this.client.del(key);
        console.log(`Session deleted: ${sessionId}`);
    }

    /**
     * Löscht alle Sessions eines Users (z.B. bei Password-Change)
     * @param {string} userId - User-ID
     */
    async deleteUserSessions(userId) {
        const pattern = 'session:*';
        let cursor = 0;
        let deletedCount = 0;

        do {
            const result = await this.client.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });
            
            cursor = result.cursor;
            const keys = result.keys;

            for (const key of keys) {
                const data = await this.client.get(key);
                if (data) {
                    const session = JSON.parse(data);
                    if (session.userId === userId) {
                        await this.client.del(key);
                        deletedCount++;
                    }
                }
            }
        } while (cursor !== 0);

        console.log(`Deleted ${deletedCount} sessions for user ${userId}`);
        return deletedCount;
    }

    // ========================================================================
    // SETTINGS CACHE (Write-Through Pattern)
    // ========================================================================

    /**
     * Holt Settings aus dem Cache
     * @param {string} entityType - 'user', 'organization', 'team', 'project'
     * @param {string} entityId - UUID der Entity
     * @param {string} settingKey - Setting-Key
     * @returns {any|null} Setting-Value oder null
     */
    async getSetting(entityType, entityId, settingKey) {
        const key = `setting:${entityType}:${entityId}:${settingKey}`;
        const value = await this.client.get(key);
        
        if (value === null) {
            return null; // Cache Miss
        }

        return JSON.parse(value);
    }

    /**
     * Schreibt Setting in den Cache (nach DB-Write)
     * @param {string} entityType - 'user', 'organization', 'team', 'project'
     * @param {string} entityId - UUID der Entity
     * @param {string} settingKey - Setting-Key
     * @param {any} settingValue - Setting-Value
     * @param {number} ttl - Time to live (default: 1 Stunde)
     */
    async setSetting(entityType, entityId, settingKey, settingValue, ttl = 3600) {
        const key = `setting:${entityType}:${entityId}:${settingKey}`;
        await this.client.setEx(key, ttl, JSON.stringify(settingValue));
        console.log(`Setting cached: ${key}`);
    }

    /**
     * Invalidiert ein Setting im Cache
     * @param {string} entityType - 'user', 'organization', 'team', 'project'
     * @param {string} entityId - UUID der Entity
     * @param {string} settingKey - Setting-Key (optional, null = alle Settings der Entity)
     */
    async invalidateSetting(entityType, entityId, settingKey = null) {
        if (settingKey) {
            const key = `setting:${entityType}:${entityId}:${settingKey}`;
            await this.client.del(key);
            console.log(`Setting invalidated: ${key}`);
        } else {
            // Invalidiere alle Settings dieser Entity
            const pattern = `setting:${entityType}:${entityId}:*`;
            let cursor = 0;
            let deletedCount = 0;

            do {
                const result = await this.client.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100
                });
                
                cursor = result.cursor;
                const keys = result.keys;

                if (keys.length > 0) {
                    await this.client.del(keys);
                    deletedCount += keys.length;
                }
            } while (cursor !== 0);

            console.log(`Invalidated ${deletedCount} settings for ${entityType}:${entityId}`);
        }
    }

    /**
     * Holt alle Settings einer Entity aus dem Cache
     * @param {string} entityType - 'user', 'organization', 'team', 'project'
     * @param {string} entityId - UUID der Entity
     * @returns {object} Key-Value Objekt mit allen Settings
     */
    async getAllSettings(entityType, entityId) {
        const pattern = `setting:${entityType}:${entityId}:*`;
        const settings = {};
        let cursor = 0;

        do {
            const result = await this.client.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });
            
            cursor = result.cursor;
            const keys = result.keys;

            for (const key of keys) {
                const value = await this.client.get(key);
                if (value) {
                    const settingKey = key.split(':').pop();
                    settings[settingKey] = JSON.parse(value);
                }
            }
        } while (cursor !== 0);

        return settings;
    }

    // ========================================================================
    // RATE LIMITING
    // ========================================================================

    /**
     * Prüft und inkrementiert Rate Limit
     * @param {string} identifier - z.B. userId oder IP
     * @param {string} action - z.B. 'login', 'api_call'
     * @param {number} maxRequests - Max. Anzahl erlaubter Requests
     * @param {number} windowSeconds - Zeitfenster in Sekunden
     * @returns {object} { allowed: boolean, remaining: number, resetAt: timestamp }
     */
    async checkRateLimit(identifier, action, maxRequests = 100, windowSeconds = 3600) {
        const key = `ratelimit:${action}:${identifier}`;
        const current = await this.client.incr(key);
        
        if (current === 1) {
            await this.client.expire(key, windowSeconds);
        }

        const ttl = await this.client.ttl(key);
        const resetAt = Date.now() + (ttl * 1000);

        return {
            allowed: current <= maxRequests,
            remaining: Math.max(0, maxRequests - current),
            resetAt: resetAt,
            current: current
        };
    }

    // ========================================================================
    // CACHE OPERATIONS
    // ========================================================================

    /**
     * Generisches Caching mit TTL
     * @param {string} key - Cache-Key
     * @param {any} value - Wert zum Cachen
     * @param {number} ttl - Time to live in Sekunden
     */
    async set(key, value, ttl = 3600) {
        await this.client.setEx(key, ttl, JSON.stringify(value));
    }

    /**
     * Holt einen Wert aus dem Cache
     * @param {string} key - Cache-Key
     * @returns {any|null} Gecachter Wert oder null
     */
    async get(key) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }

    /**
     * Löscht einen Cache-Eintrag
     * @param {string} key - Cache-Key
     */
    async delete(key) {
        await this.client.del(key);
    }

    /**
     * Prüft ob ein Key existiert
     * @param {string} key - Cache-Key
     * @returns {boolean}
     */
    async exists(key) {
        return (await this.client.exists(key)) === 1;
    }

    /**
     * Health Check
     * @returns {boolean}
     */
    async ping() {
        try {
            const response = await this.client.ping();
            return response === 'PONG';
        } catch (error) {
            return false;
        }
    }
}

// Singleton Instance
let redisServiceInstance = null;

function getRedisService() {
    if (!redisServiceInstance) {
        redisServiceInstance = new RedisService();
    }
    return redisServiceInstance;
}

module.exports = {
    RedisService,
    getRedisService
};
