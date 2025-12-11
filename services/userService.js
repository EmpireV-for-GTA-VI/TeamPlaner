const { executeQuery } = require('../database');

/**
 * User Service - Verwaltet User-Daten
 */
class UserService {
    
    /**
     * Finde oder erstelle User basierend auf FiveM ID
     * @param {Object} userData - User Daten von Discourse
     * @returns {Object} User Objekt
     */
    async findOrCreateUser(userData) {
        const { fivemId, username, avatarUrl, trustLevel, isAdmin, isModerator } = userData;
        
        // Prüfe ob User existiert
        const existingUser = await this.findByFivemId(fivemId);
        
        if (existingUser) {
            // Update last_login und Session-Daten
            await executeQuery(`
                UPDATE users 
                SET 
                    cfx_username = ?,
                    avatar_url = ?,
                    trust_level = ?,
                    is_admin = ?,
                    is_moderator = ?,
                    last_login = NOW(),
                    last_seen = NOW()
                WHERE fivem_id = ?
            `, [username, avatarUrl, trustLevel, isAdmin, isModerator, fivemId]);
            
            // Reload User
            return await this.findByFivemId(fivemId);
        }
        
        // Erstelle neuen User
        const displayName = username; // Initial = CFX Username
        
        const result = await executeQuery(`
            INSERT INTO users (
                fivem_id, 
                cfx_username, 
                display_name,
                avatar_url,
                trust_level,
                is_admin,
                is_moderator,
                organisation_id,
                group_id,
                role_id,
                last_login,
                last_seen
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, NOW(), NOW())
        `, [fivemId, username, displayName, avatarUrl, trustLevel, isAdmin, isModerator]);
        
        if (!result.success) {
            throw new Error('Failed to create user: ' + result.error);
        }
        
        // Return created user
        return await this.findByFivemId(fivemId);
    }
    
    /**
     * Finde User nach FiveM ID
     */
    async findByFivemId(fivemId) {
        const result = await executeQuery(`
            SELECT 
                u.*,
                o.name as organisation_name,
                o.color as organisation_color,
                g.name as group_name,
                g.color as group_color,
                r.name as role_name,
                r.color as role_color,
                r.permissions as role_permissions,
                r.priority as role_priority
            FROM users u
            LEFT JOIN organisations o ON u.organisation_id = o.id
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.fivem_id = ?
            LIMIT 1
        `, [fivemId]);
        
        if (!result.success || !result.data || result.data.length === 0) {
            return null;
        }
        
        return this.formatUser(result.data[0]);
    }
    
    /**
     * Finde User nach ID
     */
    async findById(userId) {
        const result = await executeQuery(`
            SELECT 
                u.*,
                o.name as organisation_name,
                o.color as organisation_color,
                g.name as group_name,
                g.color as group_color,
                r.name as role_name,
                r.color as role_color,
                r.permissions as role_permissions,
                r.priority as role_priority
            FROM users u
            LEFT JOIN organisations o ON u.organisation_id = o.id
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
            LIMIT 1
        `, [userId]);
        
        if (!result.success || !result.data || result.data.length === 0) {
            return null;
        }
        
        return this.formatUser(result.data[0]);
    }
    
    /**
     * Update Custom Username
     */
    async updateCustomUsername(userId, customUsername) {
        // Validierung
        if (!customUsername || customUsername.length < 3 || customUsername.length > 50) {
            throw new Error('Username muss zwischen 3 und 50 Zeichen lang sein');
        }
        
        // Prüfe ob Username bereits existiert
        const existing = await executeQuery(`
            SELECT id FROM users WHERE custom_username = ? AND id != ?
        `, [customUsername, userId]);
        
        if (existing.success && existing.data && existing.data.length > 0) {
            throw new Error('Dieser Username ist bereits vergeben');
        }
        
        // Update
        const result = await executeQuery(`
            UPDATE users 
            SET 
                custom_username = ?,
                display_name = ?
            WHERE id = ?
        `, [customUsername, customUsername, userId]);
        
        return result.success;
    }
    
    /**
     * Update Organisation/Group/Role
     */
    async updateUserRoles(userId, { organisationId, groupId, roleId }) {
        const updates = [];
        const params = [];
        
        if (organisationId !== undefined) {
            updates.push('organisation_id = ?');
            params.push(organisationId);
        }
        if (groupId !== undefined) {
            updates.push('group_id = ?');
            params.push(groupId);
        }
        if (roleId !== undefined) {
            updates.push('role_id = ?');
            params.push(roleId);
        }
        
        if (updates.length === 0) {
            return false;
        }
        
        params.push(userId);
        
        const result = await executeQuery(`
            UPDATE users SET ${updates.join(', ')} WHERE id = ?
        `, params);
        
        return result.success;
    }
    
    /**
     * Update last_seen Timestamp
     */
    async updateLastSeen(userId) {
        await executeQuery(`
            UPDATE users SET last_seen = NOW() WHERE id = ?
        `, [userId]);
    }
    
    /**
     * Prüfe ob User Permission hat
     */
    hasPermission(user, permission) {
        if (!user || !user.role_permissions) {
            return false;
        }
        
        // Admin hat alle Rechte
        if (user.is_admin) {
            return true;
        }
        
        try {
            const permissions = JSON.parse(user.role_permissions);
            
            // Wildcard Permission
            if (permissions.includes('*')) {
                return true;
            }
            
            // Exakte Permission
            if (permissions.includes(permission)) {
                return true;
            }
            
            // Wildcard mit Prefix (z.B. "tasks.*" matched "tasks.create")
            const wildcardPerms = permissions.filter(p => p.endsWith('.*'));
            for (const wildcard of wildcardPerms) {
                const prefix = wildcard.replace('.*', '');
                if (permission.startsWith(prefix + '.')) {
                    return true;
                }
            }
            
            return false;
        } catch (e) {
            console.error('Permission check error:', e);
            return false;
        }
    }
    
    /**
     * Formatiere User-Objekt für Response
     */
    formatUser(dbUser) {
        return {
            id: dbUser.id,
            fivemId: dbUser.fivem_id,
            cfxUsername: dbUser.cfx_username,
            customUsername: dbUser.custom_username,
            displayName: dbUser.display_name,
            avatarUrl: dbUser.avatar_url,
            
            // Rechte
            organisation: dbUser.organisation_id ? {
                id: dbUser.organisation_id,
                name: dbUser.organisation_name,
                color: dbUser.organisation_color
            } : null,
            
            group: dbUser.group_id ? {
                id: dbUser.group_id,
                name: dbUser.group_name,
                color: dbUser.group_color
            } : null,
            
            role: dbUser.role_id ? {
                id: dbUser.role_id,
                name: dbUser.role_name,
                color: dbUser.role_color,
                permissions: dbUser.role_permissions,
                priority: dbUser.role_priority
            } : null,
            
            // Metadata
            trustLevel: dbUser.trust_level,
            isAdmin: Boolean(dbUser.is_admin),
            isModerator: Boolean(dbUser.is_moderator),
            isActive: Boolean(dbUser.is_active),
            
            lastLogin: dbUser.last_login,
            lastSeen: dbUser.last_seen,
            createdAt: dbUser.created_at,
            
            // Internal (nicht an Frontend senden)
            _apiKey: dbUser.discourse_api_key,
            _permissions: dbUser.role_permissions
        };
    }
}

module.exports = new UserService();
