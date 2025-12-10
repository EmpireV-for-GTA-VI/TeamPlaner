/**
 * ============================================================================
 * Team Routes
 * ============================================================================
 * 
 * Alle Routes mit SpiceDB Permission Checks
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { requireAuth, requirePermission } = require('../middleware/auth.middleware');
const { getSpiceDBService } = require('../services/spicedb.service');
const { v4: uuidv4 } = require('uuid');

const pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'teamplaner',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

// ============================================================================
// GET /api/teams - Get all teams user can view
// ============================================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const spiceDBService = getSpiceDBService();
        
        // Hole alle Team-IDs die der User sehen darf (SpiceDB Lookup)
        const teamIds = await spiceDBService.lookupResources(
            req.userId,
            'view',
            'team'
        );

        if (teamIds.length === 0) {
            return res.json({ success: true, teams: [] });
        }

        // Hole Team-Details aus PostgreSQL
        const result = await pgPool.query(
            `SELECT t.id, t.name, t.description, t.color, t.created_at,
                    o.name as organization_name
             FROM teams t
             JOIN organizations o ON t.organization_id = o.id
             WHERE t.id = ANY($1) AND t.is_active = true
             ORDER BY t.created_at DESC`,
            [teamIds]
        );

        res.json({
            success: true,
            teams: result.rows
        });

    } catch (error) {
        console.error('Failed to get teams:', error);
        res.status(500).json({
            error: 'Failed to get teams',
            message: error.message
        });
    }
});

// ============================================================================
// GET /api/teams/:teamId - Get specific team
// ============================================================================
router.get('/:teamId', requireAuth, requirePermission('team', 'view'), async (req, res) => {
    try {
        const { teamId } = req.params;

        const result = await pgPool.query(
            `SELECT t.*, o.name as organization_name, o.id as organization_id
             FROM teams t
             JOIN organizations o ON t.organization_id = o.id
             WHERE t.id = $1 AND t.is_active = true`,
            [teamId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Team not found'
            });
        }

        res.json({
            success: true,
            team: result.rows[0]
        });

    } catch (error) {
        console.error('Failed to get team:', error);
        res.status(500).json({
            error: 'Failed to get team',
            message: error.message
        });
    }
});

// ============================================================================
// POST /api/teams - Create new team
// ============================================================================
router.post('/', requireAuth, async (req, res) => {
    try {
        const { organizationId, name, description, color } = req.body;

        // Check: Darf User Teams in dieser Org erstellen?
        const spiceDBService = getSpiceDBService();
        const canCreate = await spiceDBService.checkPermission(
            req.userId,
            'create_team',
            'organization',
            organizationId
        );

        if (!canCreate) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: 'You cannot create teams in this organization'
            });
        }

        // Erstelle Team in PostgreSQL
        const teamId = uuidv4();
        const result = await pgPool.query(
            `INSERT INTO teams (id, organization_id, name, description, color, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [teamId, organizationId, name, description, color || 'blue', req.userId]
        );

        const team = result.rows[0];

        // Setze Berechtigungen in SpiceDB
        await spiceDBService.createRelationship('team', teamId, 'owner', 'user', req.userId);
        await spiceDBService.linkTeamToOrganization(teamId, organizationId);

        res.status(201).json({
            success: true,
            team
        });

    } catch (error) {
        console.error('Failed to create team:', error);
        res.status(500).json({
            error: 'Failed to create team',
            message: error.message
        });
    }
});

// ============================================================================
// PUT /api/teams/:teamId - Update team
// ============================================================================
router.put('/:teamId', requireAuth, requirePermission('team', 'update'), async (req, res) => {
    try {
        const { teamId } = req.params;
        const { name, description, color } = req.body;

        const result = await pgPool.query(
            `UPDATE teams
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 color = COALESCE($3, color),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND is_active = true
             RETURNING *`,
            [name, description, color, teamId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Team not found'
            });
        }

        res.json({
            success: true,
            team: result.rows[0]
        });

    } catch (error) {
        console.error('Failed to update team:', error);
        res.status(500).json({
            error: 'Failed to update team',
            message: error.message
        });
    }
});

// ============================================================================
// DELETE /api/teams/:teamId - Delete team
// ============================================================================
router.delete('/:teamId', requireAuth, requirePermission('team', 'delete'), async (req, res) => {
    try {
        const { teamId } = req.params;

        // Soft Delete in PostgreSQL
        await pgPool.query(
            'UPDATE teams SET is_active = false WHERE id = $1',
            [teamId]
        );

        // Lösche Berechtigungen in SpiceDB
        const spiceDBService = getSpiceDBService();
        await spiceDBService.deleteAllRelationshipsForResource('team', teamId);

        res.json({
            success: true,
            message: 'Team deleted'
        });

    } catch (error) {
        console.error('Failed to delete team:', error);
        res.status(500).json({
            error: 'Failed to delete team',
            message: error.message
        });
    }
});

// ============================================================================
// POST /api/teams/:teamId/members - Add team member
// ============================================================================
router.post('/:teamId/members', requireAuth, requirePermission('team', 'manage_members'), async (req, res) => {
    try {
        const { teamId } = req.params;
        const { userId, role } = req.body; // role: 'admin' oder 'member'

        const spiceDBService = getSpiceDBService();
        await spiceDBService.createRelationship('team', teamId, role || 'member', 'user', userId);

        res.json({
            success: true,
            message: 'Member added'
        });

    } catch (error) {
        console.error('Failed to add member:', error);
        res.status(500).json({
            error: 'Failed to add member',
            message: error.message
        });
    }
});

// ============================================================================
// DELETE /api/teams/:teamId/members/:userId - Remove team member
// ============================================================================
router.delete('/:teamId/members/:userId', requireAuth, requirePermission('team', 'manage_members'), async (req, res) => {
    try {
        const { teamId, userId } = req.params;

        const spiceDBService = getSpiceDBService();
        
        // Lösche alle Relationen (admin, member) für diesen User
        await spiceDBService.deleteRelationship('team', teamId, 'member', 'user', userId);
        await spiceDBService.deleteRelationship('team', teamId, 'admin', 'user', userId);

        res.json({
            success: true,
            message: 'Member removed'
        });

    } catch (error) {
        console.error('Failed to remove member:', error);
        res.status(500).json({
            error: 'Failed to remove member',
            message: error.message
        });
    }
});

module.exports = router;
