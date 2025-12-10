/**
 * ============================================================================
 * Authentication Middleware
 * ============================================================================
 * 
 * Middleware für Express zum Schutz von Routes
 * Validiert Session und Token aus Redis
 */

const { getAuthService } = require('../services/auth.service');

/**
 * Middleware: Erfordert gültige Authentifizierung
 */
async function requireAuth(req, res, next) {
    try {
        const sessionId = req.headers['x-session-id'];
        const token = req.headers['authorization']?.replace('Bearer ', '');

        if (!sessionId || !token) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Missing session or token'
            });
        }

        const authService = getAuthService();
        const session = await authService.validateSession(sessionId, token);

        // Füge Session-Daten zum Request hinzu
        req.session = session;
        req.userId = session.userId;

        next();

    } catch (error) {
        return res.status(401).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
}

/**
 * Middleware: Erfordert spezifische Permission auf eine Ressource
 * 
 * Verwendung:
 * app.get('/teams/:teamId', requireAuth, requirePermission('team', 'view'), async (req, res) => { ... });
 */
function requirePermission(resourceType, permission) {
    return async (req, res, next) => {
        try {
            const authService = getAuthService();
            
            // Resource-ID aus Route-Parametern extrahieren
            const resourceIdParam = `${resourceType}Id`;
            const resourceId = req.params[resourceIdParam];

            if (!resourceId) {
                return res.status(400).json({
                    error: 'Bad request',
                    message: `Missing ${resourceIdParam} parameter`
                });
            }

            // Permission Check mit SpiceDB (Fail-Closed!)
            const hasPermission = await authService.authorize(
                req.userId,
                permission,
                resourceType,
                resourceId
            );

            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: `Insufficient permissions to ${permission} this ${resourceType}`
                });
            }

            next();

        } catch (error) {
            console.error('Permission check failed:', error);
            return res.status(403).json({
                error: 'Authorization failed',
                message: 'Permission check failed - access denied'
            });
        }
    };
}

/**
 * Middleware: Rate Limiting
 */
function rateLimit(action, maxRequests = 100, windowSeconds = 3600) {
    return async (req, res, next) => {
        try {
            const { getRedisService } = require('../services/redis.service');
            const redisService = getRedisService();

            const identifier = req.userId || req.ip;
            const limit = await redisService.checkRateLimit(
                identifier,
                action,
                maxRequests,
                windowSeconds
            );

            // Setze Rate-Limit Headers
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', limit.remaining);
            res.setHeader('X-RateLimit-Reset', new Date(limit.resetAt).toISOString());

            if (!limit.allowed) {
                return res.status(429).json({
                    error: 'Too many requests',
                    message: 'Rate limit exceeded',
                    resetAt: limit.resetAt
                });
            }

            next();

        } catch (error) {
            console.error('Rate limit check failed:', error);
            // Bei Fehler: Weiter (fail-open für Rate Limiting)
            next();
        }
    };
}

module.exports = {
    requireAuth,
    requirePermission,
    rateLimit
};
