const express = require('express');
const router = express.Router();
const userService = require('../services/userService');

/**
 * Middleware: Require Authentication
 */
function requireAuth(req, res, next) {
    if (!req.session?.user?.authenticated) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    next();
}

/**
 * Middleware: Require Permission
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        if (!userService.hasPermission(req.session.user, permission)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                required: permission
            });
        }
        
        next();
    };
}

/**
 * GET /api/profile
 * Vollständiges Profil mit allen Daten
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        // Reload User aus DB (für aktuelle Daten)
        const user = await userService.findById(req.session.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Update Session mit aktuellen DB-Daten
        req.session.user = {
            ...req.session.user,
            ...user
        };
        
        res.json({
            success: true,
            user: {
                ...user,
                // Entferne interne Felder
                _apiKey: undefined,
                _permissions: undefined,
                _discourseData: undefined
            }
        });
        
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
});

/**
 * PUT /api/profile/username
 * Username ändern
 */
router.put('/username', requireAuth, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }
        
        // Update Username
        await userService.updateCustomUsername(req.session.user.id, username);
        
        // Reload User
        const updatedUser = await userService.findById(req.session.user.id);
        
        // Update Session
        req.session.user.customUsername = updatedUser.customUsername;
        req.session.user.displayName = updatedUser.displayName;
        
        res.json({
            success: true,
            message: 'Username updated successfully',
            user: {
                customUsername: updatedUser.customUsername,
                displayName: updatedUser.displayName
            }
        });
        
    } catch (error) {
        console.error('Username update error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/profile/roles
 * Organisation/Group/Role ändern (Admin only)
 */
router.put('/roles', requireAuth, requirePermission('users.manage'), async (req, res) => {
    try {
        const { userId, organisationId, groupId, roleId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }
        
        // Update Roles
        await userService.updateUserRoles(userId, {
            organisationId,
            groupId,
            roleId
        });
        
        // Reload User
        const updatedUser = await userService.findById(userId);
        
        res.json({
            success: true,
            message: 'Roles updated successfully',
            user: updatedUser
        });
        
    } catch (error) {
        console.error('Roles update error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/profile/permissions
 * Alle Permissions des aktuellen Users
 */
router.get('/permissions', requireAuth, async (req, res) => {
    try {
        const user = req.session.user;
        
        let permissions = [];
        
        if (user.role?.permissions) {
            try {
                permissions = JSON.parse(user.role.permissions);
            } catch (e) {
                permissions = [];
            }
        }
        
        res.json({
            success: true,
            permissions: permissions,
            isAdmin: user.isAdmin,
            role: user.role?.name
        });
        
    } catch (error) {
        console.error('Permissions fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch permissions'
        });
    }
});

module.exports = router;
