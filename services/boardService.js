const { executeQuery } = require('../database');

/**
 * Board Service - Verwaltet Boards, Kategorien und Karten
 */
class BoardService {
    
    // ==================== BOARDS ====================
    
    /**
     * Hole alle Boards mit Berechtigungs-Check
     */
    async getBoards(user) {
        let query = `
            SELECT DISTINCT
                b.*,
                u.display_name as creator_name,
                COUNT(DISTINCT c.id) as card_count
            FROM boards b
            LEFT JOIN users u ON b.created_by = u.id
            LEFT JOIN cards c ON b.id = c.board_id
            WHERE b.is_public = TRUE
        `;
        
        const params = [];
        
        // Wenn nicht Admin, prüfe spezifische Berechtigungen
        if (!user.isAdmin) {
            query += ` 
                OR b.id IN (
                    SELECT board_id FROM board_permissions 
                    WHERE 
                        (organisation_id = ? OR organisation_id IS NULL)
                        AND (group_id = ? OR group_id IS NULL)
                        AND (role_id = ? OR role_id IS NULL)
                )
                OR b.created_by = ?
            `;
            params.push(
                user.organisation?.id || null,
                user.group?.id || null,
                user.role?.id || null,
                user.id
            );
        }
        
        query += ` GROUP BY b.id ORDER BY b.position ASC, b.created_at DESC`;
        
        const result = await executeQuery(query, params);
        return result.success ? result.data : [];
    }
    
    /**
     * Hole ein einzelnes Board mit allen Kategorien und Karten
     */
    async getBoard(boardId, user) {
        // Prüfe Berechtigung
        const hasAccess = await this.checkBoardAccess(boardId, user, 'view');
        if (!hasAccess) {
            throw new Error('No access to this board');
        }
        
        // Board-Daten
        const boardResult = await executeQuery(`
            SELECT b.*, u.display_name as creator_name
            FROM boards b
            LEFT JOIN users u ON b.created_by = u.id
            WHERE b.id = ?
        `, [boardId]);
        
        if (!boardResult.success || boardResult.data.length === 0) {
            return null;
        }
        
        const board = boardResult.data[0];
        
        // Kategorien mit Karten laden
        const categoriesResult = await executeQuery(`
            SELECT * FROM categories
            WHERE board_id = ?
            ORDER BY position ASC
        `, [boardId]);
        
        const categories = categoriesResult.success ? categoriesResult.data : [];
        
        // Für jede Kategorie die Karten laden
        for (const category of categories) {
            const cardsResult = await executeQuery(`
                SELECT 
                    c.*,
                    creator.display_name as creator_name,
                    (SELECT COUNT(*) FROM subtasks WHERE card_id = c.id AND is_completed = 0) as open_subtasks,
                    (SELECT COUNT(*) FROM subtasks WHERE card_id = c.id AND is_completed = 1) as completed_subtasks
                FROM cards c
                LEFT JOIN users creator ON c.created_by = creator.id
                WHERE c.category_id = ?
                ORDER BY c.position ASC
            `, [category.id]);
            
            const cards = cardsResult.success ? cardsResult.data : [];
            
            // Für jede Karte Tags und Assigned Users laden
            for (const card of cards) {
                // Tags laden
                const tagsResult = await executeQuery(`
                    SELECT t.id, t.name, t.color
                    FROM tags t
                    INNER JOIN card_tags ct ON ct.tag_id = t.id
                    WHERE ct.card_id = ?
                `, [card.id]);
                card.tags = tagsResult.success ? tagsResult.data : [];
                
                // Assigned Users laden
                const assignedResult = await executeQuery(`
                    SELECT u.id, u.display_name, u.avatar_url, u.role_id, r.name as role_name
                    FROM users u
                    INNER JOIN card_assignments ca ON ca.user_id = u.id
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE ca.card_id = ?
                `, [card.id]);
                card.assigned_users = assignedResult.success ? assignedResult.data : [];
            }
            
            category.cards = cards;
        }
        
        board.categories = categories;
        
        return board;
    }
    
    /**
     * Erstelle neues Board
     */
    async createBoard(data, user) {
        const { name, description, color, icon, is_public, permissions } = data;
        
        // Höchste Position finden
        const maxPosResult = await executeQuery(`
            SELECT MAX(position) as max_pos FROM boards
        `);
        
        const nextPosition = (maxPosResult.data[0]?.max_pos || -1) + 1;
        
        // Board erstellen
        const result = await executeQuery(`
            INSERT INTO boards (name, description, color, icon, is_public, created_by, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [name, description || null, color || '#3B82F6', icon || '📋', is_public || false, user.id, nextPosition]);
        
        if (!result.success) {
            throw new Error('Failed to create board');
        }
        
        // MariaDB gibt insertId im data-Objekt zurück
        const boardId = result.data.insertId;
        
        if (!boardId) {
            console.error('❌ Board creation failed - no insertId. Result:', JSON.stringify(result));
            throw new Error('Failed to get board ID after creation');
        }
        
        console.log('✅ Board created with ID:', boardId);
        
        // Standard-Kategorien erstellen (SOFORT nach Board-Erstellung)
        const catResult = await executeQuery(`
            INSERT INTO categories (board_id, name, color, position)
            VALUES 
            (?, 'To Do', '#EF4444', 0),
            (?, 'In Progress', '#F59E0B', 1),
            (?, 'Done', '#10B981', 2)
        `, [boardId, boardId, boardId]);
        
        if (!catResult.success) {
            console.error('❌ Category creation failed:', catResult);
            throw new Error('Failed to create default categories');
        }
        
        // Berechtigungen hinzufügen
        if (permissions && permissions.length > 0) {
            for (const perm of permissions) {
                await this.addBoardPermission(boardId, perm);
            }
        }
        
        // Board vollständig laden und zurückgeben
        return await this.getBoard(boardId, user);
    }
    
    /**
     * Update Board
     */
    async updateBoard(boardId, data, user) {
        // Prüfe Admin-Berechtigung
        const hasAccess = await this.checkBoardAccess(boardId, user, 'admin');
        if (!hasAccess) {
            throw new Error('No admin access to this board');
        }
        
        const { name, description, color, icon, is_public } = data;
        
        const result = await executeQuery(`
            UPDATE boards
            SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                color = COALESCE(?, color),
                icon = COALESCE(?, icon),
                is_public = COALESCE(?, is_public)
            WHERE id = ?
        `, [name, description, color, icon, is_public, boardId]);
        
        return result.success;
    }
    
    /**
     * Lösche Board
     */
    async deleteBoard(boardId, user) {
        // Nur Ersteller oder Admin
        const board = await executeQuery('SELECT created_by FROM boards WHERE id = ?', [boardId]);
        
        if (!board.success || board.data.length === 0) {
            throw new Error('Board not found');
        }
        
        if (board.data[0].created_by !== user.id && !user.isAdmin) {
            throw new Error('Only creator or admin can delete board');
        }
        
        const result = await executeQuery('DELETE FROM boards WHERE id = ?', [boardId]);
        return result.success;
    }
    
    /**
     * Verschiebe Board (Drag & Drop)
     */
    async moveBoard(boardId, targetPosition, user) {
        // Prüfe Zugriff
        const hasAccess = await this.checkBoardAccess(boardId, user, 'view');
        if (!hasAccess) {
            throw new Error('No access to this board');
        }
        
        console.log(`🔄 Moving board ${boardId} to position ${targetPosition}`);
        
        // Hole alle Boards des Users sortiert
        const boards = await this.getBoards(user);
        const draggedBoardIndex = boards.findIndex(b => b.id === boardId);
        
        if (draggedBoardIndex === -1) {
            throw new Error('Board not found');
        }
        
        if (draggedBoardIndex === targetPosition) {
            return true; // Keine Änderung nötig
        }
        
        console.log(`  📦 Boards before: ${boards.map(b => b.id).join(', ')}`);
        console.log(`  🎯 Moving from index ${draggedBoardIndex} to index ${targetPosition}`);
        
        // Verschiebe im Array
        const [draggedBoard] = boards.splice(draggedBoardIndex, 1);
        boards.splice(targetPosition, 0, draggedBoard);
        
        console.log(`  📦 Boards after: ${boards.map(b => b.id).join(', ')}`);
        
        // Aktualisiere position in der Datenbank (0, 1, 2, 3, ...)
        for (let i = 0; i < boards.length; i++) {
            await executeQuery(`
                UPDATE boards 
                SET position = ?
                WHERE id = ?
            `, [i, boards[i].id]);
            console.log(`  ✏️ Board ${boards[i].id} → position ${i}`);
        }
        
        console.log(`✅ Board ${boardId} moved successfully`);
        return true;
    }
    
    // ==================== KATEGORIEN ====================
    
    /**
     * Erstelle neue Kategorie
     */
    async createCategory(boardId, data, user) {
        const hasAccess = await this.checkBoardAccess(boardId, user, 'edit');
        if (!hasAccess) {
            throw new Error('No edit access to this board');
        }
        
        const { name, description, color } = data;
        
        // Höchste Position finden
        const maxPosResult = await executeQuery(`
            SELECT MAX(position) as max_pos FROM categories WHERE board_id = ?
        `, [boardId]);
        
        const nextPosition = (maxPosResult.data[0].max_pos || -1) + 1;
        
        const result = await executeQuery(`
            INSERT INTO categories (board_id, name, description, color, position)
            VALUES (?, ?, ?, ?, ?)
        `, [boardId, name, description || null, color || '#3B82F6', nextPosition]);
        
        return result.success ? result.insertId : null;
    }
    
    /**
     * Update Kategorie
     */
    async updateCategory(categoryId, data, user) {
        const { name, description, color, position } = data;
        
        // Hole board_id für Permission-Check
        const catResult = await executeQuery('SELECT board_id FROM categories WHERE id = ?', [categoryId]);
        if (!catResult.success || catResult.data.length === 0) {
            throw new Error('Category not found');
        }
        
        const boardId = catResult.data[0].board_id;
        const hasAccess = await this.checkBoardAccess(boardId, user, 'edit');
        if (!hasAccess) {
            throw new Error('No edit access');
        }
        
        const result = await executeQuery(`
            UPDATE categories
            SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                color = COALESCE(?, color),
                position = COALESCE(?, position)
            WHERE id = ?
        `, [name, description, color, position, categoryId]);
        
        return result.success;
    }
    
    /**
     * Lösche Kategorie
     */
    async deleteCategory(categoryId, user) {
        // Hole board_id
        const catResult = await executeQuery('SELECT board_id FROM categories WHERE id = ?', [categoryId]);
        if (!catResult.success || catResult.data.length === 0) {
            throw new Error('Category not found');
        }
        
        const boardId = catResult.data[0].board_id;
        const hasAccess = await this.checkBoardAccess(boardId, user, 'admin');
        if (!hasAccess) {
            throw new Error('No admin access');
        }
        
        const result = await executeQuery('DELETE FROM categories WHERE id = ?', [categoryId]);
        return result.success;
    }
    
    // ==================== KARTEN ====================
    
    /**
     * Erstelle neue Karte
     */
    async createCard(categoryId, data, user) {
        const { title, description, priority, assigned_to, due_date } = data;
        
        // Hole board_id für Permission-Check
        const catResult = await executeQuery('SELECT board_id FROM categories WHERE id = ?', [categoryId]);
        if (!catResult.success || catResult.data.length === 0) {
            throw new Error('Category not found');
        }
        
        const boardId = catResult.data[0].board_id;
        const hasAccess = await this.checkBoardAccess(boardId, user, 'edit');
        if (!hasAccess) {
            throw new Error('No edit access');
        }
        
        // Höchste Position finden
        const maxPosResult = await executeQuery(`
            SELECT MAX(position) as max_pos FROM cards WHERE category_id = ?
        `, [categoryId]);
        
        const nextPosition = (maxPosResult.data[0].max_pos || -1) + 1;
        
        const result = await executeQuery(`
            INSERT INTO cards (category_id, board_id, title, description, priority, assigned_to, created_by, due_date, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            categoryId, 
            boardId, 
            title, 
            description || null, 
            priority || 'medium',
            assigned_to || null,
            user.id,
            due_date || null,
            nextPosition
        ]);
        
        return result.success ? result.insertId : null;
    }
    
    /**
     * Update Karte
     */
    async updateCard(cardId, data, user) {
        const { title, description, priority, assigned_to, due_date, position, category_id } = data;
        
        // Hole board_id
        const cardResult = await executeQuery('SELECT board_id FROM cards WHERE id = ?', [cardId]);
        if (!cardResult.success || cardResult.data.length === 0) {
            throw new Error('Card not found');
        }
        
        const boardId = cardResult.data[0].board_id;
        const hasAccess = await this.checkBoardAccess(boardId, user, 'edit');
        if (!hasAccess) {
            throw new Error('No edit access');
        }
        
        const result = await executeQuery(`
            UPDATE cards
            SET 
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                priority = COALESCE(?, priority),
                assigned_to = COALESCE(?, assigned_to),
                due_date = COALESCE(?, due_date),
                position = COALESCE(?, position),
                category_id = COALESCE(?, category_id)
            WHERE id = ?
        `, [title, description, priority, assigned_to, due_date, position, category_id, cardId]);
        
        return result.success;
    }
    
    /**
     * Verschiebe Karte (Drag & Drop)
     */
    async moveCard(cardId, targetCategoryId, targetPosition, user) {
        // Hole Card & Board
        const cardResult = await executeQuery('SELECT board_id, category_id, position FROM cards WHERE id = ?', [cardId]);
        if (!cardResult.success || cardResult.data.length === 0) {
            throw new Error('Card not found');
        }
        
        const card = cardResult.data[0];
        const hasAccess = await this.checkBoardAccess(card.board_id, user, 'edit');
        if (!hasAccess) {
            throw new Error('No edit access');
        }
        
        const sourceCategoryId = card.category_id;
        const sourcePosition = card.position;
        
        console.log(`🔄 Moving card ${cardId}: from category ${sourceCategoryId} pos ${sourcePosition} → to category ${targetCategoryId} pos ${targetPosition}`);
        
        if (sourceCategoryId === targetCategoryId) {
            // Innerhalb der gleichen Kategorie verschieben
            
            // Hole alle Karten der Kategorie sortiert nach Position
            const cardsResult = await executeQuery(`
                SELECT id, position FROM cards 
                WHERE category_id = ? 
                ORDER BY position ASC
            `, [sourceCategoryId]);
            
            if (!cardsResult.success) {
                throw new Error('Failed to load cards');
            }
            
            const cards = cardsResult.data;
            const draggedCardIndex = cards.findIndex(c => c.id === cardId);
            
            if (draggedCardIndex === -1) {
                throw new Error('Dragged card not found');
            }
            
            // targetPosition ist bereits der gewünschte Index (0-basiert)
            if (draggedCardIndex === targetPosition) {
                return true; // Keine Änderung nötig
            }
            
            console.log(`  📦 Cards before: ${cards.map(c => c.id).join(', ')}`);
            console.log(`  🎯 Moving from index ${draggedCardIndex} to index ${targetPosition}`);
            
            // Verschiebe die Karte im Array
            const [draggedCard] = cards.splice(draggedCardIndex, 1);
            cards.splice(targetPosition, 0, draggedCard);
            
            console.log(`  📦 Cards after: ${cards.map(c => c.id).join(', ')}`);
            
            // Setze neue Positionen (0, 1, 2, 3, ...)
            for (let i = 0; i < cards.length; i++) {
                await executeQuery(`
                    UPDATE cards SET position = ? WHERE id = ?
                `, [i, cards[i].id]);
                console.log(`  ✏️ Card ${cards[i].id} → position ${i}`);
            }
            
        } else {
            // Zwischen Kategorien verschieben
            
            console.log(`  📤 Moving card from category ${sourceCategoryId} to ${targetCategoryId}`);
            
            // 1. Hole alle Karten der Quell-Kategorie (außer der zu verschiebenden)
            const sourceCardsResult = await executeQuery(`
                SELECT id, position FROM cards 
                WHERE category_id = ? AND id != ?
                ORDER BY position ASC
            `, [sourceCategoryId, cardId]);
            
            if (sourceCardsResult.success) {
                // Re-nummeriere die verbleibenden Karten
                console.log(`  📤 Source category: Re-numbering ${sourceCardsResult.data.length} remaining cards`);
                for (let i = 0; i < sourceCardsResult.data.length; i++) {
                    await executeQuery(`
                        UPDATE cards SET position = ? WHERE id = ?
                    `, [i, sourceCardsResult.data[i].id]);
                }
            }
            
            // 2. Hole alle Karten der Ziel-Kategorie
            const targetCardsResult = await executeQuery(`
                SELECT id, position FROM cards 
                WHERE category_id = ?
                ORDER BY position ASC
            `, [targetCategoryId]);
            
            if (!targetCardsResult.success) {
                throw new Error('Failed to load target cards');
            }
            
            const targetCards = targetCardsResult.data;
            console.log(`  📥 Target category has ${targetCards.length} cards`);
            console.log(`  📥 Inserting at index ${targetPosition}`);
            
            // 3. Füge die verschobene Karte an der Zielposition im Array ein
            targetCards.splice(targetPosition, 0, { id: cardId });
            
            // 4. Aktualisiere die Kategorie der verschobenen Karte
            await executeQuery(`
                UPDATE cards 
                SET category_id = ?
                WHERE id = ?
            `, [targetCategoryId, cardId]);
            
            // 5. Re-nummeriere ALLE Karten in der Ziel-Kategorie (inklusive der verschobenen)
            for (let i = 0; i < targetCards.length; i++) {
                await executeQuery(`
                    UPDATE cards SET position = ? WHERE id = ?
                `, [i, targetCards[i].id]);
                console.log(`  ✏️ Card ${targetCards[i].id} → position ${i}`);
            }
        }
        
        console.log(`✅ Card ${cardId} moved successfully`);
        return true;
    }
    
    /**
     * Lösche Karte
     */
    async deleteCard(cardId, user) {
        // Hole board_id
        const cardResult = await executeQuery('SELECT board_id FROM cards WHERE id = ?', [cardId]);
        if (!cardResult.success || cardResult.data.length === 0) {
            throw new Error('Card not found');
        }
        
        const boardId = cardResult.data[0].board_id;
        const hasAccess = await this.checkBoardAccess(boardId, user, 'edit');
        if (!hasAccess) {
            throw new Error('No edit access');
        }
        
        const result = await executeQuery('DELETE FROM cards WHERE id = ?', [cardId]);
        return result.success;
    }
    
    // ==================== BERECHTIGUNGEN ====================
    
    /**
     * Prüfe Board-Zugriff
     */
    async checkBoardAccess(boardId, user, requiredLevel = 'view') {
        // Admins haben immer Zugriff
        if (user.isAdmin) {
            return true;
        }
        
        // Prüfe ob Board öffentlich ist
        const boardResult = await executeQuery(`
            SELECT is_public, created_by FROM boards WHERE id = ?
        `, [boardId]);
        
        if (!boardResult.success || boardResult.data.length === 0) {
            return false;
        }
        
        const board = boardResult.data[0];
        
        // Ersteller hat immer vollen Zugriff
        if (board.created_by === user.id) {
            return true;
        }
        
        // Öffentliche Boards: View für alle
        if (board.is_public && requiredLevel === 'view') {
            return true;
        }
        
        // Prüfe spezifische Berechtigungen
        const permResult = await executeQuery(`
            SELECT permission_level FROM board_permissions
            WHERE board_id = ?
            AND (
                organisation_id = ? OR organisation_id IS NULL
            )
            AND (
                group_id = ? OR group_id IS NULL
            )
            AND (
                role_id = ? OR role_id IS NULL
            )
            ORDER BY 
                CASE permission_level
                    WHEN 'admin' THEN 3
                    WHEN 'edit' THEN 2
                    WHEN 'view' THEN 1
                END DESC
            LIMIT 1
        `, [
            boardId,
            user.organisation?.id || null,
            user.group?.id || null,
            user.role?.id || null
        ]);
        
        if (permResult.success && permResult.data.length > 0) {
            const userLevel = permResult.data[0].permission_level;
            
            // Level-Check
            const levels = { view: 1, edit: 2, admin: 3 };
            return levels[userLevel] >= levels[requiredLevel];
        }
        
        return false;
    }
    
    /**
     * Füge Board-Berechtigung hinzu
     */
    async addBoardPermission(boardId, permission) {
        const { organisation_id, group_id, role_id, permission_level } = permission;
        
        const result = await executeQuery(`
            INSERT INTO board_permissions (board_id, organisation_id, group_id, role_id, permission_level)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE permission_level = VALUES(permission_level)
        `, [
            boardId,
            organisation_id || null,
            group_id || null,
            role_id || null,
            permission_level || 'view'
        ]);
        
        return result.success;
    }
    
    /**
     * Hole Board-Berechtigungen (mit granularen Rechten)
     */
    async getBoardPermissions(boardId) {
        const result = await executeQuery(`
            SELECT 
                bp.*,
                g.name as group_name,
                r.name as role_name,
                u.display_name as user_name
            FROM board_permissions bp
            LEFT JOIN \`groups\` g ON bp.group_id = g.id
            LEFT JOIN roles r ON bp.role_id = r.id
            LEFT JOIN users u ON bp.user_id = u.id
            WHERE bp.board_id = ?
        `, [boardId]);
        
        if (!result.success) return [];
        
        // Formatiere für Frontend
        return result.data.map(perm => ({
            id: perm.id,
            type: perm.group_id ? 'group' : perm.role_id ? 'role' : 'user',
            targetId: perm.group_id || perm.role_id || perm.user_id,
            targetName: perm.group_name || perm.role_name || perm.user_name,
            rights: {
                can_view: Boolean(perm.can_view),
                can_create_card: Boolean(perm.can_create_card),
                can_edit_card: Boolean(perm.can_edit_card),
                can_delete_card: Boolean(perm.can_delete_card),
                can_move_card: Boolean(perm.can_move_card),
                can_create_category: Boolean(perm.can_create_category),
                can_edit_category: Boolean(perm.can_edit_category),
                can_delete_category: Boolean(perm.can_delete_category),
                can_manage_permissions: Boolean(perm.can_manage_permissions)
            }
        }));
    }
    
    /**
     * Lösche Board-Berechtigung
     */
    async removeBoardPermission(permissionId) {
        const result = await executeQuery('DELETE FROM board_permissions WHERE id = ?', [permissionId]);
        return result.success;
    }
    
    // ==================== ERWEITERTE KARTEN-FEATURES ====================
    
    /**
     * Verschiebe Karte zu anderem Board
     */
    async transferCard(cardId, targetBoardId, user) {
        // Erste Kategorie des Ziel-Boards finden
        const categoryResult = await executeQuery(`
            SELECT id FROM categories 
            WHERE board_id = ? 
            ORDER BY position ASC 
            LIMIT 1
        `, [targetBoardId]);
        
        if (!categoryResult.success || categoryResult.data.length === 0) {
            throw new Error('Target board has no categories');
        }
        
        const targetCategoryId = categoryResult.data[0].id;
        
        // Karte verschieben
        const result = await executeQuery(`
            UPDATE cards 
            SET board_id = ?, category_id = ?, position = 0
            WHERE id = ?
        `, [targetBoardId, targetCategoryId, cardId]);
        
        return result.success;
    }
    
    /**
     * Hole alle Tags eines Boards
     */
    async getBoardTags(boardId) {
        const result = await executeQuery(`
            SELECT * FROM tags 
            WHERE board_id = ? 
            ORDER BY name ASC
        `, [boardId]);
        
        return result.success ? result.data : [];
    }
    
    /**
     * Erstelle neuen Tag
     */
    async createTag(boardId, name, color) {
        const result = await executeQuery(`
            INSERT INTO tags (board_id, name, color)
            VALUES (?, ?, ?)
        `, [boardId, name, color || '#3B82F6']);
        
        return result.success ? Number(result.data.insertId) : null;
    }
    
    /**
     * Lösche Tag
     */
    async deleteTag(tagId) {
        const result = await executeQuery('DELETE FROM tags WHERE id = ?', [tagId]);
        return result.success;
    }
    
    /**
     * Füge Tag zu Karte hinzu
     */
    async addTagToCard(cardId, tagId) {
        const result = await executeQuery(`
            INSERT IGNORE INTO card_tags (card_id, tag_id)
            VALUES (?, ?)
        `, [cardId, tagId]);
        
        return result.success;
    }
    
    /**
     * Entferne Tag von Karte
     */
    async removeTagFromCard(cardId, tagId) {
        const result = await executeQuery(`
            DELETE FROM card_tags 
            WHERE card_id = ? AND tag_id = ?
        `, [cardId, tagId]);
        
        return result.success;
    }
    
    /**
     * Weise Benutzer zu Karte zu
     */
    async assignUserToCard(cardId, userId) {
        const result = await executeQuery(`
            INSERT IGNORE INTO card_assignments (card_id, user_id)
            VALUES (?, ?)
        `, [cardId, userId]);
        
        return result.success;
    }
    
    /**
     * Entferne Benutzer-Zuweisung von Karte
     */
    async unassignUserFromCard(cardId, userId) {
        const result = await executeQuery(`
            DELETE FROM card_assignments 
            WHERE card_id = ? AND user_id = ?
        `, [cardId, userId]);
        
        return result.success;
    }
    
    /**
     * Hole alle Subtasks einer Karte
     */
    async getSubtasks(cardId) {
        const result = await executeQuery(`
            SELECT * FROM subtasks 
            WHERE card_id = ? 
            ORDER BY position ASC
        `, [cardId]);
        
        return result.success ? result.data : [];
    }
    
    /**
     * Erstelle neuen Subtask
     */
    async createSubtask(cardId, title) {
        const result = await executeQuery(`
            INSERT INTO subtasks (card_id, title)
            VALUES (?, ?)
        `, [cardId, title]);
        
        return result.success ? Number(result.data.insertId) : null;
    }
    
    /**
     * Aktualisiere Subtask
     */
    async updateSubtask(subtaskId, updates) {
        const { title, is_completed } = updates;
        const result = await executeQuery(`
            UPDATE subtasks 
            SET title = COALESCE(?, title),
                is_completed = COALESCE(?, is_completed)
            WHERE id = ?
        `, [title, is_completed, subtaskId]);
        
        return result.success;
    }
    
    /**
     * Lösche Subtask
     */
    async deleteSubtask(subtaskId) {
        const result = await executeQuery('DELETE FROM subtasks WHERE id = ?', [subtaskId]);
        return result.success;
    }
    
    /**
     * Hole alle Medien einer Karte
     */
    async getCardMedia(cardId) {
        const result = await executeQuery(`
            SELECT m.*, u.display_name as uploaded_by_name
            FROM card_media m
            LEFT JOIN users u ON m.uploaded_by = u.id
            WHERE m.card_id = ?
            ORDER BY m.created_at DESC
        `, [cardId]);
        
        return result.success ? result.data : [];
    }
    
    /**
     * Füge Medium zu Karte hinzu
     */
    async addMediaToCard(cardId, media) {
        const { type, url, filename, uploadedBy } = media;
        const result = await executeQuery(`
            INSERT INTO card_media (card_id, type, url, filename, uploaded_by)
            VALUES (?, ?, ?, ?, ?)
        `, [cardId, type, url, filename || null, uploadedBy]);
        
        return result.success ? Number(result.data.insertId) : null;
    }
    
    /**
     * Lösche Medium
     */
    async deleteMedia(mediaId) {
        const result = await executeQuery('DELETE FROM card_media WHERE id = ?', [mediaId]);
        return result.success;
    }
    
    /**
     * Hole alle Benutzer für Zuweisungen
     */
    async getAllUsers() {
        const result = await executeQuery(`
            SELECT id, display_name, avatar_url, organisation_id, group_id, role_id
            FROM users 
            WHERE is_active = TRUE
            ORDER BY display_name ASC
        `);
        
        return result.success ? result.data : [];
    }
}

module.exports = new BoardService();
