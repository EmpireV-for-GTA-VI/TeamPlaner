/**
 * ============================================================================
 * Project Routes
 * ============================================================================
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
// GET /api/projects - Get all projects user can view
// ============================================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const spiceDBService = getSpiceDBService();
        
        const projectIds = await spiceDBService.lookupResources(
            req.userId,
            'view',
            'project'
        );

        if (projectIds.length === 0) {
            return res.json({ success: true, projects: [] });
        }

        const result = await pgPool.query(
            `SELECT p.*, t.name as team_name
             FROM projects p
             JOIN teams t ON p.team_id = t.id
             WHERE p.id = ANY($1)
             ORDER BY p.created_at DESC`,
            [projectIds]
        );

        res.json({
            success: true,
            projects: result.rows
        });

    } catch (error) {
        console.error('Failed to get projects:', error);
        res.status(500).json({
            error: 'Failed to get projects',
            message: error.message
        });
    }
});

// ============================================================================
// GET /api/projects/:projectId - Get specific project
// ============================================================================
router.get('/:projectId', requireAuth, requirePermission('project', 'view'), async (req, res) => {
    try {
        const { projectId } = req.params;

        const result = await pgPool.query(
            `SELECT p.*, t.name as team_name, t.id as team_id
             FROM projects p
             JOIN teams t ON p.team_id = t.id
             WHERE p.id = $1`,
            [projectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            project: result.rows[0]
        });

    } catch (error) {
        console.error('Failed to get project:', error);
        res.status(500).json({
            error: 'Failed to get project',
            message: error.message
        });
    }
});

// ============================================================================
// POST /api/projects - Create new project
// ============================================================================
router.post('/', requireAuth, async (req, res) => {
    try {
        const { teamId, name, description, status, priority } = req.body;

        const spiceDBService = getSpiceDBService();
        const canCreate = await spiceDBService.checkPermission(
            req.userId,
            'create_project',
            'team',
            teamId
        );

        if (!canCreate) {
            return res.status(403).json({
                error: 'Insufficient permissions'
            });
        }

        const projectId = uuidv4();
        const result = await pgPool.query(
            `INSERT INTO projects (id, team_id, name, description, status, priority, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [projectId, teamId, name, description, status || 'active', priority || 'medium', req.userId]
        );

        const project = result.rows[0];

        await spiceDBService.createRelationship('project', projectId, 'owner', 'user', req.userId);
        await spiceDBService.linkProjectToTeam(projectId, teamId);

        res.status(201).json({
            success: true,
            project
        });

    } catch (error) {
        console.error('Failed to create project:', error);
        res.status(500).json({
            error: 'Failed to create project',
            message: error.message
        });
    }
});

module.exports = router;
