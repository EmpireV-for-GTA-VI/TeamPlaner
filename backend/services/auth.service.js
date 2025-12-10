/**
 * ============================================================================
 * Authentication Service
 * ============================================================================
 * 
 * Integriert alle 3 Säulen:
 * - PostgreSQL: User-Daten und Credentials
 * - Redis: Session Management
 * - SpiceDB: Permission Checks
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { Pool } = require('pg');
const { getRedisService } = require('./redis.service');
const { getSpiceDBService } = require('./spicedb.service');

class AuthService {
    constructor() {
        this.pgPool = null;
        this.redisService = null;
        this.spiceDBService = null;
    }

    /**
     * Initialisierung
     */
    async initialize(pgPool) {
        this.pgPool = pgPool;
        this.redisService = getRedisService();
        this.spiceDBService = getSpiceDBService();
    }

    // ========================================================================
    // REGISTRATION
    // ========================================================================

    /**
     * Registriert einen neuen User
     * 1. Schreibt in PostgreSQL (SSOT)
     * 2. Erstellt initiale Berechtigungen in SpiceDB
     * 
     * @param {object} userData - { email, password, firstName, lastName }
     * @returns {object} User-Objekt (ohne password_hash)
     */
    async register(userData) {
        const { email, password, firstName, lastName } = userData;

        // Validierung
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        try {
            // 1. Prüfe ob User bereits existiert (PostgreSQL)
            const existingUser = await this.pgPool.query(
                'SELECT id FROM users WHERE email = $1',
                [email.toLowerCase()]
            );

            if (existingUser.rows.length > 0) {
                throw new Error('User with this email already exists');
            }

            // 2. Hash Password
            const passwordHash = await bcrypt.hash(password, 12);

            // 3. Erstelle User in PostgreSQL (SSOT)
            const userId = uuidv4();
            const result = await this.pgPool.query(
                `INSERT INTO users (id, email, password_hash, first_name, last_name)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, email, first_name, last_name, created_at, is_active`,
                [userId, email.toLowerCase(), passwordHash, firstName, lastName]
            );

            const user = result.rows[0];

            // 4. Erstelle Default-Organisation für User
            const organizationId = uuidv4();
            await this.pgPool.query(
                `INSERT INTO organizations (id, name, slug, created_by)
                 VALUES ($1, $2, $3, $4)`,
                [organizationId, `${firstName}'s Organization`, `${firstName.toLowerCase()}-org-${Date.now()}`, userId]
            );

            // 5. Setze Berechtigungen in SpiceDB
            await this.spiceDBService.makeOrganizationAdmin(userId, organizationId);

            console.log(`User registered: ${email}`);
            return user;

        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    // ========================================================================
    // LOGIN
    // ========================================================================

    /**
     * Login-Prozess
     * 1. Validiert Credentials gegen PostgreSQL
     * 2. Erstellt Session in Redis
     * 3. Cached User-Settings in Redis
     * 
     * @param {string} email - User Email
     * @param {string} password - Plain-Text Password
     * @param {string} ipAddress - Client IP
     * @param {string} userAgent - Client User-Agent
     * @returns {object} { user, sessionId, token }
     */
    async login(email, password, ipAddress, userAgent) {
        try {
            // 1. Rate Limiting (Redis)
            const rateLimit = await this.redisService.checkRateLimit(
                ipAddress, 
                'login', 
                5,  // Max 5 Versuche
                300 // Pro 5 Minuten
            );

            if (!rateLimit.allowed) {
                throw new Error(`Too many login attempts. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds`);
            }

            // 2. Hole User aus PostgreSQL (SSOT)
            const result = await this.pgPool.query(
                `SELECT id, email, password_hash, first_name, last_name, avatar_url, is_active
                 FROM users 
                 WHERE email = $1`,
                [email.toLowerCase()]
            );

            if (result.rows.length === 0) {
                throw new Error('Invalid credentials');
            }

            const user = result.rows[0];

            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            // 3. Validiere Password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            // 4. Update last_login_at in PostgreSQL
            await this.pgPool.query(
                'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

            // 5. Erstelle Session in Redis
            const sessionId = uuidv4();
            const token = this.generateToken();

            await this.redisService.createSession(sessionId, {
                userId: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                avatarUrl: user.avatar_url,
                token: token,
                ipAddress: ipAddress,
                userAgent: userAgent
            }, 86400); // 24 Stunden

            // 6. Cache User-Settings (aus PostgreSQL -> Redis)
            await this.cacheUserSettings(user.id);

            // 7. Audit Log
            await this.createAuditLog({
                userId: user.id,
                action: 'login',
                entityType: 'user',
                entityId: user.id,
                ipAddress,
                userAgent
            });

            // User-Objekt ohne sensible Daten
            const sanitizedUser = {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                avatarUrl: user.avatar_url
            };

            console.log(`User logged in: ${email}`);
            return { user: sanitizedUser, sessionId, token };

        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    // ========================================================================
    // LOGOUT
    // ========================================================================

    /**
     * Logout
     * @param {string} sessionId - Session ID
     */
    async logout(sessionId) {
        try {
            const session = await this.redisService.getSession(sessionId);
            
            if (session) {
                await this.createAuditLog({
                    userId: session.userId,
                    action: 'logout',
                    entityType: 'user',
                    entityId: session.userId
                });
            }

            await this.redisService.deleteSession(sessionId);
            console.log(`User logged out: ${sessionId}`);

        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    // ========================================================================
    // SESSION VALIDATION
    // ========================================================================

    /**
     * Validiert Session und Token
     * @param {string} sessionId - Session ID
     * @param {string} token - Auth Token
     * @returns {object} Session-Daten
     */
    async validateSession(sessionId, token) {
        try {
            // Hole Session aus Redis
            const session = await this.redisService.getSession(sessionId);

            if (!session) {
                throw new Error('Invalid session');
            }

            if (session.token !== token) {
                throw new Error('Invalid token');
            }

            // Prüfe ob User noch aktiv ist (PostgreSQL)
            const result = await this.pgPool.query(
                'SELECT is_active FROM users WHERE id = $1',
                [session.userId]
            );

            if (result.rows.length === 0 || !result.rows[0].is_active) {
                await this.redisService.deleteSession(sessionId);
                throw new Error('User is not active');
            }

            return session;

        } catch (error) {
            console.error('Session validation failed:', error);
            throw error;
        }
    }

    // ========================================================================
    // AUTHORIZATION (Integration mit SpiceDB)
    // ========================================================================

    /**
     * Prüft ob der aktuelle User eine Permission auf eine Ressource hat
     * WICHTIG: Fail-Closed bei SpiceDB-Fehlern!
     * 
     * @param {string} userId - User UUID
     * @param {string} permission - z.B. 'view', 'edit', 'delete'
     * @param {string} resourceType - z.B. 'team', 'project'
     * @param {string} resourceId - Resource UUID
     * @returns {boolean}
     */
    async authorize(userId, permission, resourceType, resourceId) {
        try {
            // Hole aus SpiceDB (Der Wächter)
            const hasPermission = await this.spiceDBService.checkPermission(
                userId,
                permission,
                resourceType,
                resourceId
            );

            // Audit Log bei wichtigen Aktionen
            if (['delete', 'manage_members', 'update'].includes(permission)) {
                await this.createAuditLog({
                    userId,
                    action: `permission_check_${permission}`,
                    entityType: resourceType,
                    entityId: resourceId,
                    newValue: { hasPermission }
                });
            }

            return hasPermission;

        } catch (error) {
            console.error('Authorization failed:', error);
            // Fail-Closed: Bei Fehler wird Zugriff verweigert
            return false;
        }
    }

    // ========================================================================
    // SETTINGS MANAGEMENT (PostgreSQL <-> Redis Synchronisation)
    // ========================================================================

    /**
     * Cached alle User-Settings aus PostgreSQL in Redis
     * @param {string} userId - User UUID
     */
    async cacheUserSettings(userId) {
        try {
            const result = await this.pgPool.query(
                `SELECT setting_key, setting_value 
                 FROM settings 
                 WHERE entity_type = 'user' AND entity_id = $1`,
                [userId]
            );

            for (const row of result.rows) {
                await this.redisService.setSetting(
                    'user',
                    userId,
                    row.setting_key,
                    row.setting_value,
                    3600 // 1 Stunde TTL
                );
            }

            console.log(`Cached ${result.rows.length} settings for user ${userId}`);

        } catch (error) {
            console.error('Failed to cache user settings:', error);
        }
    }

    /**
     * Holt ein Setting (Cache-Aside Pattern)
     * 1. Versuche aus Redis (Cache)
     * 2. Bei Miss: Hole aus PostgreSQL und cache es
     * 
     * @param {string} entityType - 'user', 'organization', 'team', 'project'
     * @param {string} entityId - Entity UUID
     * @param {string} settingKey - Setting Key
     * @returns {any} Setting Value
     */
    async getSetting(entityType, entityId, settingKey) {
        try {
            // 1. Versuche aus Cache (Redis)
            let value = await this.redisService.getSetting(entityType, entityId, settingKey);

            if (value !== null) {
                return value; // Cache Hit
            }

            // 2. Cache Miss: Hole aus PostgreSQL
            const result = await this.pgPool.query(
                `SELECT setting_value 
                 FROM settings 
                 WHERE entity_type = $1 AND entity_id = $2 AND setting_key = $3`,
                [entityType, entityId, settingKey]
            );

            if (result.rows.length === 0) {
                return null;
            }

            value = result.rows[0].setting_value;

            // 3. Cache für nächstes Mal
            await this.redisService.setSetting(entityType, entityId, settingKey, value);

            return value;

        } catch (error) {
            console.error('Failed to get setting:', error);
            throw error;
        }
    }

    /**
     * Speichert ein Setting (Write-Through Pattern)
     * 1. Schreibe in PostgreSQL (SSOT)
     * 2. Schreibe in Redis (Cache)
     * 
     * @param {string} entityType - 'user', 'organization', 'team', 'project'
     * @param {string} entityId - Entity UUID
     * @param {string} settingKey - Setting Key
     * @param {any} settingValue - Setting Value
     */
    async setSetting(entityType, entityId, settingKey, settingValue) {
        try {
            // 1. Schreibe in PostgreSQL (SSOT)
            await this.pgPool.query(
                `INSERT INTO settings (entity_type, entity_id, setting_key, setting_value)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (entity_type, entity_id, setting_key)
                 DO UPDATE SET setting_value = $4, updated_at = CURRENT_TIMESTAMP`,
                [entityType, entityId, settingKey, JSON.stringify(settingValue)]
            );

            // 2. Schreibe in Cache (Redis)
            await this.redisService.setSetting(entityType, entityId, settingKey, settingValue);

            console.log(`Setting saved: ${entityType}:${entityId}:${settingKey}`);

        } catch (error) {
            console.error('Failed to set setting:', error);
            throw error;
        }
    }

    /**
     * Löscht ein Setting
     * 1. Lösche aus PostgreSQL
     * 2. Invalidiere Cache
     */
    async deleteSetting(entityType, entityId, settingKey) {
        try {
            await this.pgPool.query(
                `DELETE FROM settings 
                 WHERE entity_type = $1 AND entity_id = $2 AND setting_key = $3`,
                [entityType, entityId, settingKey]
            );

            await this.redisService.invalidateSetting(entityType, entityId, settingKey);

            console.log(`Setting deleted: ${entityType}:${entityId}:${settingKey}`);

        } catch (error) {
            console.error('Failed to delete setting:', error);
            throw error;
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Generiert einen sicheren Token
     */
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Erstellt einen Audit Log Eintrag
     */
    async createAuditLog(data) {
        try {
            await this.pgPool.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    data.userId || null,
                    data.action,
                    data.entityType,
                    data.entityId,
                    data.oldValue ? JSON.stringify(data.oldValue) : null,
                    data.newValue ? JSON.stringify(data.newValue) : null,
                    data.ipAddress || null,
                    data.userAgent || null
                ]
            );
        } catch (error) {
            console.error('Failed to create audit log:', error);
        }
    }
}

// Singleton Instance
let authServiceInstance = null;

function getAuthService() {
    if (!authServiceInstance) {
        authServiceInstance = new AuthService();
    }
    return authServiceInstance;
}

module.exports = {
    AuthService,
    getAuthService
};
