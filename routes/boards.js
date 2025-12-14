const express = require('express');
const router = express.Router();
const boardService = require('../services/boardService');
const { executeQuery } = require('../database');
const { requireTeamOrg, requireProjectLeader } = require('../middleware/auth');

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
 * Konvertiere BigInt zu Number rekursiv
 */
function convertBigIntToNumber(obj) {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'bigint') {
        return Number(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => convertBigIntToNumber(item));
    }
    
    if (typeof obj === 'object') {
        const converted = {};
        for (const key in obj) {
            converted[key] = convertBigIntToNumber(obj[key]);
        }
        return converted;
    }
    
    return obj;
}

// ==================== MIDDLEWARE ====================
// Alle Board-Routes benötigen Team-Organisation
router.use(requireAuth);
router.use(requireTeamOrg);

// ==================== BOARDS ====================

/**
 * GET /api/boards/users
 * Hole alle Benutzer für Zuweisungen
 * WICHTIG: Muss VOR /:id Route stehen!
 */
router.get('/users', async (req, res) => {
    try {
        const users = await boardService.getAllUsers();
        
        res.json({
            success: true,
            users: convertBigIntToNumber(users)
        });
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/boards
 * Hole alle Boards (mit Berechtigungen gefiltert)
 */
router.get('/', async (req, res) => {
    try {
        const boards = await boardService.getBoards(req.session.user);
        
        res.json({
            success: true,
            boards: convertBigIntToNumber(boards)
        });
        
    } catch (error) {
        console.error('Get boards error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/boards/:id
 * Hole einzelnes Board mit allen Kategorien und Karten
 */
router.get('/:id', async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);
        const board = await boardService.getBoard(boardId, req.session.user);
        
        if (!board) {
            return res.status(404).json({
                success: false,
                error: 'Board not found'
            });
        }
        
        res.json({
            success: true,
            board: convertBigIntToNumber(board)
        });
        
    } catch (error) {
        console.error('Get board error:', error);
        res.status(error.message === 'No access to this board' ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/boards
 * Erstelle neues Board
 */
router.post('/', async (req, res) => {
    try {
        const { name, description, color, icon, is_public, permissions } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Board name is required'
            });
        }
        
        const board = await boardService.createBoard({
            name,
            description,
            color,
            icon,
            is_public,
            permissions
        }, req.session.user);
        
        res.json({
            success: true,
            message: 'Board created successfully',
            board: convertBigIntToNumber(board)
        });
        
    } catch (error) {
        console.error('Create board error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/boards/:id
 * Update Board
 */
router.put('/:id', async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);
        const { name, description, color, icon, is_public } = req.body;
        
        await boardService.updateBoard(boardId, {
            name,
            description,
            color,
            icon,
            is_public
        }, req.session.user);
        
        res.json({
            success: true,
            message: 'Board updated successfully'
        });
        
    } catch (error) {
        console.error('Update board error:', error);
        res.status(error.message.includes('access') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/boards/:id/move
 * Verschiebe Board (Drag & Drop)
 */
router.post('/:id/move', async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);
        const { position } = req.body;
        
        if (position === undefined) {
            return res.status(400).json({
                success: false,
                error: 'position is required'
            });
        }
        
        await boardService.moveBoard(boardId, position, req.session.user);
        
        res.json({
            success: true,
            message: 'Board moved successfully'
        });
        
    } catch (error) {
        console.error('Move board error:', error);
        res.status(error.message.includes('access') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/boards/:id
 * Lösche Board
 */
router.delete('/:id', async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);
        await boardService.deleteBoard(boardId, req.session.user);
        
        res.json({
            success: true,
            message: 'Board deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete board error:', error);
        res.status(error.message.includes('access') || error.message.includes('creator') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== KATEGORIEN ====================

/**
 * POST /api/boards/:boardId/categories
 * Erstelle neue Kategorie
 */
router.post('/:boardId/categories', async (req, res) => {
    try {
        const boardId = parseInt(req.params.boardId);
        const { name, description, color } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }
        
        const categoryId = await boardService.createCategory(boardId, {
            name,
            description,
            color
        }, req.session.user);
        
        res.json({
            success: true,
            message: 'Category created successfully',
            categoryId: convertBigIntToNumber(categoryId)
        });
        
    } catch (error) {
        console.error('Create category error:', error);
        res.status(error.message.includes('access') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/boards/categories/:id
 * Update Kategorie
 */
router.put('/categories/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const { name, description, color, position } = req.body;
        
        await boardService.updateCategory(categoryId, {
            name,
            description,
            color,
            position
        }, req.session.user);
        
        res.json({
            success: true,
            message: 'Category updated successfully'
        });
        
    } catch (error) {
        console.error('Update category error:', error);
        res.status(error.message.includes('access') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/boards/categories/:id
 * Lösche Kategorie
 */
router.delete('/categories/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        await boardService.deleteCategory(categoryId, req.session.user);
        
        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(error.message.includes('access') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== KARTEN ====================

/**
 * POST /api/boards/categories/:categoryId/cards
 * Erstelle neue Karte
 */
router.post('/categories/:categoryId/cards', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.categoryId);
        const { title, description, priority, assigned_to, due_date } = req.body;
        
        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Card title is required'
            });
        }
        
        const cardId = await boardService.createCard(categoryId, {
            title,
            description,
            priority,
            assigned_to,
            due_date
        }, req.session.user);
        
        res.json({
            success: true,
            message: 'Card created successfully',
            cardId: convertBigIntToNumber(cardId)
        });
        
    } catch (error) {
        console.error('Create card error:', error);
        res.status(error.message.includes('access') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/boards/cards/:id
 * Update Karte
 */
router.put('/cards/:id', async (req, res) => {
    try {
        const cardId = parseInt(req.params.id);
        const { title, description, priority, assigned_to, due_date, position, category_id } = req.body;
        
        await boardService.updateCard(cardId, {
            title,
            description,
            priority,
            assigned_to,
            due_date,
            position,
            category_id
        }, req.session.user);
        
        res.json({
            success: true,
            message: 'Card updated successfully'
        });
        
    } catch (error) {
        console.error('Update card error:', error);
        res.status(error.message.includes('access') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/boards/cards/:id/move
 * Verschiebe Karte (Drag & Drop)
 */
router.post('/cards/:id/move', async (req, res) => {
    try {
        const cardId = parseInt(req.params.id);
        const { categoryId, position } = req.body;
        
        if (!categoryId || position === undefined) {
            return res.status(400).json({
                success: false,
                error: 'categoryId and position are required'
            });
        }
        
        await boardService.moveCard(cardId, categoryId, position, req.session.user);
        
        res.json({
            success: true,
            message: 'Card moved successfully'
        });
        
    } catch (error) {
        console.error('Move card error:', error);
        res.status(error.message.includes('access') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/boards/cards/:id
 * Lösche Karte
 */
router.delete('/cards/:id', async (req, res) => {
    try {
        const cardId = parseInt(req.params.id);
        await boardService.deleteCard(cardId, req.session.user);
        
        res.json({
            success: true,
            message: 'Card deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete card error:', error);
        res.status(error.message.includes('access') ? 403 : 500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== BERECHTIGUNGEN ====================

/**
 * GET /api/boards/:id/permissions
 * Hole alle Berechtigungen für ein Board
 */
router.get('/:id/permissions', requireProjectLeader, async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);
        
        // Prüfe Admin-Zugriff
        const hasAccess = await boardService.checkBoardAccess(boardId, req.session.user, 'admin');
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'No admin access to this board'
            });
        }
        
        const permissions = await boardService.getBoardPermissions(boardId);
        
        res.json({
            success: true,
            permissions: permissions
        });
        
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/boards/:id/permissions
 * Setze granulare Berechtigungen (Groups, Roles, Users mit spezifischen Rechten)
 * Body: { permissions: [{ type, targetId, rights: {...} }] }
 */
router.post('/:id/permissions', requireProjectLeader, async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);
        const { permissions } = req.body; // Array of permission objects
        
        // Prüfe Admin-Zugriff
        const hasAccess = await boardService.checkBoardAccess(boardId, req.session.user, 'admin');
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'No admin access to this board'
            });
        }
        
        // Lösche alte Berechtigungen
        await executeQuery('DELETE FROM board_permissions WHERE board_id = ?', [boardId]);
        
        // Füge neue granulare Berechtigungen hinzu
        const organisationId = 2; // Immer Team (ID=2)
        
        if (permissions && permissions.length > 0) {
            for (const perm of permissions) {
                const {
                    type, // 'group', 'role', 'user'
                    targetId,
                    rights // { can_view, can_create_card, can_edit_card, etc. }
                } = perm;
                
                // Bestimme welche Spalte gesetzt wird
                const groupId = type === 'group' ? targetId : null;
                const roleId = type === 'role' ? targetId : null;
                const userId = type === 'user' ? targetId : null;
                
                // Insert mit allen Rechten
                await executeQuery(`
                    INSERT INTO board_permissions (
                        board_id, organisation_id, group_id, role_id, user_id,
                        can_view, can_create_card, can_edit_card, can_delete_card,
                        can_move_card, can_create_category, can_edit_category,
                        can_delete_category, can_manage_permissions
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    boardId, organisationId, groupId, roleId, userId,
                    rights.can_view ?? true,
                    rights.can_create_card ?? false,
                    rights.can_edit_card ?? false,
                    rights.can_delete_card ?? false,
                    rights.can_move_card ?? false,
                    rights.can_create_category ?? false,
                    rights.can_edit_category ?? false,
                    rights.can_delete_category ?? false,
                    rights.can_manage_permissions ?? false
                ]);
            }
        }
        
        res.json({
            success: true,
            message: 'Permissions updated successfully'
        });
        
    } catch (error) {
        console.error('Update permissions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/boards/permissions/:id
 * Lösche Berechtigung
 */
router.delete('/permissions/:id', async (req, res) => {
    try {
        const permissionId = parseInt(req.params.id);
        await boardService.removeBoardPermission(permissionId);
        
        res.json({
            success: true,
            message: 'Permission removed successfully'
        });
        
    } catch (error) {
        console.error('Remove permission error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== ERWEITERTE KARTEN-FEATURES ====================

/**
 * POST /api/boards/cards/:id/transfer
 * Verschiebe Karte zu anderem Board
 */
router.post('/cards/:id/transfer', async (req, res) => {
    try {
        const cardId = parseInt(req.params.id);
        const { target_board_id } = req.body;
        
        await boardService.transferCard(cardId, target_board_id, req.session.user);
        
        res.json({
            success: true,
            message: 'Card transferred successfully'
        });
        
    } catch (error) {
        console.error('Transfer card error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/boards/:boardId/tags
 * Hole alle Tags eines Boards
 */
router.get('/:boardId/tags', requireAuth, async (req, res) => {
    try {
        const boardId = parseInt(req.params.boardId);
        const tags = await boardService.getBoardTags(boardId);
        
        res.json({
            success: true,
            tags: convertBigIntToNumber(tags)
        });
        
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/boards/:boardId/tags
 * Erstelle neuen Tag
 */
router.post('/:boardId/tags', async (req, res) => {
    try {
        const boardId = parseInt(req.params.boardId);
        const { name, color } = req.body;
        
        const tagId = await boardService.createTag(boardId, name, color);
        
        res.status(201).json({
            success: true,
            id: tagId
        });
        
    } catch (error) {
        console.error('Create tag error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/boards/tags/:id
 * Lösche Tag
 */
router.delete('/tags/:id', async (req, res) => {
    try {
        const tagId = parseInt(req.params.id);
        await boardService.deleteTag(tagId);
        
        res.json({
            success: true,
            message: 'Tag deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/boards/cards/:cardId/tags/:tagId
 * Füge Tag zu Karte hinzu
 */
router.post('/cards/:cardId/tags/:tagId', async (req, res) => {
    try {
        const cardId = parseInt(req.params.cardId);
        const tagId = parseInt(req.params.tagId);
        
        await boardService.addTagToCard(cardId, tagId);
        
        res.json({
            success: true,
            message: 'Tag added to card'
        });
        
    } catch (error) {
        console.error('Add tag to card error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/boards/cards/:cardId/tags/:tagId
 * Entferne Tag von Karte
 */
router.delete('/cards/:cardId/tags/:tagId', async (req, res) => {
    try {
        const cardId = parseInt(req.params.cardId);
        const tagId = parseInt(req.params.tagId);
        
        await boardService.removeTagFromCard(cardId, tagId);
        
        res.json({
            success: true,
            message: 'Tag removed from card'
        });
        
    } catch (error) {
        console.error('Remove tag from card error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/boards/cards/:cardId/assign/:userId
 * Weise Benutzer zu Karte zu
 */
router.post('/cards/:cardId/assign/:userId', async (req, res) => {
    try {
        const cardId = parseInt(req.params.cardId);
        const userId = parseInt(req.params.userId);
        
        await boardService.assignUserToCard(cardId, userId);
        
        res.json({
            success: true,
            message: 'User assigned to card'
        });
        
    } catch (error) {
        console.error('Assign user to card error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/boards/cards/:cardId/assign/:userId
 * Entferne Benutzer-Zuweisung von Karte
 */
router.delete('/cards/:cardId/assign/:userId', async (req, res) => {
    try {
        const cardId = parseInt(req.params.cardId);
        const userId = parseInt(req.params.userId);
        
        await boardService.unassignUserFromCard(cardId, userId);
        
        res.json({
            success: true,
            message: 'User unassigned from card'
        });
        
    } catch (error) {
        console.error('Unassign user from card error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/boards/cards/:cardId/subtasks
 * Hole alle Subtasks einer Karte
 */
router.get('/cards/:cardId/subtasks', requireAuth, async (req, res) => {
    try {
        const cardId = parseInt(req.params.cardId);
        const subtasks = await boardService.getSubtasks(cardId);
        
        res.json({
            success: true,
            subtasks: convertBigIntToNumber(subtasks)
        });
        
    } catch (error) {
        console.error('Get subtasks error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/boards/cards/:cardId/subtasks
 * Erstelle neuen Subtask
 */
router.post('/cards/:cardId/subtasks', async (req, res) => {
    try {
        const cardId = parseInt(req.params.cardId);
        const { title } = req.body;
        
        const subtaskId = await boardService.createSubtask(cardId, title);
        
        res.status(201).json({
            success: true,
            id: subtaskId
        });
        
    } catch (error) {
        console.error('Create subtask error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/boards/subtasks/:id
 * Aktualisiere Subtask
 */
router.put('/subtasks/:id', async (req, res) => {
    try {
        const subtaskId = parseInt(req.params.id);
        const { title, is_completed } = req.body;
        
        await boardService.updateSubtask(subtaskId, { title, is_completed });
        
        res.json({
            success: true,
            message: 'Subtask updated successfully'
        });
        
    } catch (error) {
        console.error('Update subtask error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/boards/subtasks/:id
 * Lösche Subtask
 */
router.delete('/subtasks/:id', async (req, res) => {
    try {
        const subtaskId = parseInt(req.params.id);
        await boardService.deleteSubtask(subtaskId);
        
        res.json({
            success: true,
            message: 'Subtask deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete subtask error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/boards/cards/:cardId/media
 * Hole alle Medien einer Karte
 */
router.get('/cards/:cardId/media', requireAuth, async (req, res) => {
    try {
        const cardId = parseInt(req.params.cardId);
        const media = await boardService.getCardMedia(cardId);
        
        res.json({
            success: true,
            media: convertBigIntToNumber(media)
        });
        
    } catch (error) {
        console.error('Get card media error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/boards/cards/:cardId/media
 * Füge Medium zu Karte hinzu
 */
router.post('/cards/:cardId/media', async (req, res) => {
    try {
        const cardId = parseInt(req.params.cardId);
        const { type, url, filename } = req.body;
        const uploadedBy = req.session.user.id;
        
        const mediaId = await boardService.addMediaToCard(cardId, { type, url, filename, uploadedBy });
        
        res.status(201).json({
            success: true,
            id: mediaId
        });
        
    } catch (error) {
        console.error('Add media to card error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/boards/media/:id
 * Lösche Medium
 */
router.delete('/media/:id', async (req, res) => {
    try {
        const mediaId = parseInt(req.params.id);
        await boardService.deleteMedia(mediaId);
        
        res.json({
            success: true,
            message: 'Media deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
