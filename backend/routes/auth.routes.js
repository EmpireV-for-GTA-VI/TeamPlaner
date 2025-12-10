/**
 * ============================================================================
 * Authentication Routes
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { getAuthService } = require('../services/auth.service');
const { requireAuth, rateLimit } = require('../middleware/auth.middleware');

// ============================================================================
// POST /api/auth/register - User Registration
// ============================================================================
router.post('/register', rateLimit('register', 5, 3600), async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        const authService = getAuthService();
        const user = await authService.register({
            email,
            password,
            firstName,
            lastName
        });

        res.status(201).json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
            error: 'Registration failed',
            message: error.message
        });
    }
});

// ============================================================================
// POST /api/auth/login - User Login
// ============================================================================
router.post('/login', rateLimit('login', 5, 300), async (req, res) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];

        const authService = getAuthService();
        const result = await authService.login(email, password, ipAddress, userAgent);

        res.json({
            success: true,
            user: result.user,
            sessionId: result.sessionId,
            token: result.token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            error: 'Login failed',
            message: error.message
        });
    }
});

// ============================================================================
// POST /api/auth/logout - User Logout
// ============================================================================
router.post('/logout', requireAuth, async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'];

        const authService = getAuthService();
        await authService.logout(sessionId);

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: error.message
        });
    }
});

// ============================================================================
// GET /api/auth/me - Get Current User
// ============================================================================
router.get('/me', requireAuth, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.session.userId,
                email: req.session.email,
                firstName: req.session.firstName,
                lastName: req.session.lastName,
                avatarUrl: req.session.avatarUrl
            }
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to get user',
            message: error.message
        });
    }
});

// ============================================================================
// GET /api/auth/session - Validate Session
// ============================================================================
router.get('/session', requireAuth, async (req, res) => {
    try {
        res.json({
            success: true,
            valid: true,
            session: {
                userId: req.session.userId,
                createdAt: req.session.createdAt,
                lastAccessedAt: req.session.lastAccessedAt
            }
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            valid: false
        });
    }
});

module.exports = router;
