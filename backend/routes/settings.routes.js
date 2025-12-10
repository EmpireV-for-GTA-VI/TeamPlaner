/**
 * ============================================================================
 * Settings Routes - PostgreSQL <-> Redis Synchronisation
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { getAuthService } = require('../services/auth.service');

// ============================================================================
// GET /api/settings/:entityType/:entityId - Get all settings
// ============================================================================
router.get('/:entityType/:entityId', requireAuth, async (req, res) => {
    try {
        const { entityType, entityId } = req.params;

        // TODO: Permission Check ob User diese Settings lesen darf

        const authService = getAuthService();
        const { getRedisService } = require('../services/redis.service');
        const redisService = getRedisService();

        // Hole alle Settings (aus Cache wenn möglich)
        const settings = await redisService.getAllSettings(entityType, entityId);

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        console.error('Failed to get settings:', error);
        res.status(500).json({
            error: 'Failed to get settings',
            message: error.message
        });
    }
});

// ============================================================================
// GET /api/settings/:entityType/:entityId/:key - Get specific setting
// ============================================================================
router.get('/:entityType/:entityId/:key', requireAuth, async (req, res) => {
    try {
        const { entityType, entityId, key } = req.params;

        const authService = getAuthService();
        const value = await authService.getSetting(entityType, entityId, key);

        if (value === null) {
            return res.status(404).json({
                error: 'Setting not found'
            });
        }

        res.json({
            success: true,
            key,
            value
        });

    } catch (error) {
        console.error('Failed to get setting:', error);
        res.status(500).json({
            error: 'Failed to get setting',
            message: error.message
        });
    }
});

// ============================================================================
// PUT /api/settings/:entityType/:entityId/:key - Update setting
// ============================================================================
router.put('/:entityType/:entityId/:key', requireAuth, async (req, res) => {
    try {
        const { entityType, entityId, key } = req.params;
        const { value } = req.body;

        // TODO: Permission Check

        const authService = getAuthService();
        await authService.setSetting(entityType, entityId, key, value);

        res.json({
            success: true,
            message: 'Setting updated'
        });

    } catch (error) {
        console.error('Failed to update setting:', error);
        res.status(500).json({
            error: 'Failed to update setting',
            message: error.message
        });
    }
});

// ============================================================================
// DELETE /api/settings/:entityType/:entityId/:key - Delete setting
// ============================================================================
router.delete('/:entityType/:entityId/:key', requireAuth, async (req, res) => {
    try {
        const { entityType, entityId, key } = req.params;

        const authService = getAuthService();
        await authService.deleteSetting(entityType, entityId, key);

        res.json({
            success: true,
            message: 'Setting deleted'
        });

    } catch (error) {
        console.error('Failed to delete setting:', error);
        res.status(500).json({
            error: 'Failed to delete setting',
            message: error.message
        });
    }
});

module.exports = router;
