const mariadb = require('mariadb');
require('dotenv').config();

// MariaDB Connection Pool erstellen
const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'spielplatz',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 5,
    acquireTimeout: 30000,
    connectTimeout: 10000,
    allowPublicKeyRetrieval: true
});

// Test der Verbindung
async function testConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('✓ MariaDB Verbindung erfolgreich hergestellt');
        return true;
    } catch (err) {
        console.error('✗ MariaDB Verbindungsfehler:', err.message);
        return false;
    } finally {
        if (conn) conn.release();
    }
}

// Query ausführen
async function executeQuery(sql, params = []) {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(sql, params);
        return { success: true, data: result };
    } catch (err) {
        console.error('Query Fehler:', err);
        return { success: false, error: err.message };
    } finally {
        if (conn) conn.release();
    }
}

// Datenbank initialisieren (Tabellen erstellen)
async function initializeDatabase() {
    const queries = [
        // ==================== USERS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fivem_id VARCHAR(50) UNIQUE NOT NULL COMMENT 'FiveM Identifier (forum.cfx.re ID)',
            cfx_username VARCHAR(100) NOT NULL COMMENT 'Username von forum.cfx.re',
            custom_username VARCHAR(100) DEFAULT NULL COMMENT 'Eigener Username (editierbar)',
            display_name VARCHAR(100) NOT NULL COMMENT 'Angezeigter Name (custom oder cfx)',
            avatar_url VARCHAR(500) DEFAULT NULL,
            
            -- Rechte-System
            organisation_id INT DEFAULT NULL COMMENT 'FK zu organisations',
            group_id INT DEFAULT NULL COMMENT 'FK zu groups',
            role_id INT DEFAULT NULL COMMENT 'FK zu roles',
            
            -- Session-Daten (wird bei Login aktualisiert)
            discourse_api_key VARCHAR(255) DEFAULT NULL COMMENT 'Discourse User API Key',
            last_login DATETIME DEFAULT NULL,
            last_seen DATETIME DEFAULT NULL,
            
            -- Metadata
            trust_level TINYINT DEFAULT 0,
            is_admin BOOLEAN DEFAULT FALSE,
            is_moderator BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_fivem_id (fivem_id),
            INDEX idx_organisation (organisation_id),
            INDEX idx_group (group_id),
            INDEX idx_role (role_id),
            
            FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL,
            FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE SET NULL,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== ORGANISATIONS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS organisations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            color VARCHAR(7) DEFAULT '#3B82F6' COMMENT 'Hex color',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== GROUPS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS \`groups\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            organisation_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            color VARCHAR(7) DEFAULT '#10B981' COMMENT 'Hex color',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_organisation (organisation_id),
            INDEX idx_name (name),
            UNIQUE KEY unique_group_per_org (organisation_id, name),
            
            FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== ROLES TABELLE ====================
        `CREATE TABLE IF NOT EXISTS roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            color VARCHAR(7) DEFAULT '#8B5CF6' COMMENT 'Hex color',
            
            -- Permissions (Bitflags oder JSON)
            permissions JSON DEFAULT NULL COMMENT 'JSON Array von Permissions',
            
            -- Hierarchy
            priority INT DEFAULT 0 COMMENT 'Höher = mehr Rechte',
            
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_group (group_id),
            INDEX idx_priority (priority),
            UNIQUE KEY unique_role_per_group (group_id, name),
            
            FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== TASKS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
            
            -- Zuweisungen
            assignee_id INT DEFAULT NULL COMMENT 'FK zu users',
            created_by INT DEFAULT NULL COMMENT 'FK zu users',
            organisation_id INT DEFAULT NULL,
            group_id INT DEFAULT NULL,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_assignee (assignee_id),
            INDEX idx_organisation (organisation_id),
            
            FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL,
            FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== PROJECTS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            start_date DATE,
            end_date DATE,
            status VARCHAR(50) DEFAULT 'active',
            
            organisation_id INT DEFAULT NULL,
            created_by INT DEFAULT NULL,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== BOARDS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS boards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            icon VARCHAR(50) DEFAULT '📋',
            color VARCHAR(7) DEFAULT '#3B82F6',
            position INT DEFAULT 0,
            
            organisation_id INT DEFAULT NULL,
            created_by INT DEFAULT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_organisation (organisation_id),
            INDEX idx_position (position),
            
            FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== CATEGORIES TABELLE ====================
        `CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            board_id INT NOT NULL,
            name VARCHAR(200) NOT NULL,
            position INT DEFAULT 0,
            color VARCHAR(7) DEFAULT '#6B7280',
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_board (board_id),
            INDEX idx_position (position),
            
            FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== CARDS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS cards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            board_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            position INT DEFAULT 0,
            
            created_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_category (category_id),
            INDEX idx_board (board_id),
            INDEX idx_position (position),
            
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
            FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== TAGS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            board_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(7) DEFAULT '#3B82F6',
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            INDEX idx_board (board_id),
            UNIQUE KEY unique_board_tag (board_id, name),
            
            FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== CARD_TAGS TABELLE (Many-to-Many) ====================
        `CREATE TABLE IF NOT EXISTS card_tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            tag_id INT NOT NULL,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            INDEX idx_card (card_id),
            INDEX idx_tag (tag_id),
            UNIQUE KEY unique_card_tag (card_id, tag_id),
            
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== CARD_ASSIGNMENTS TABELLE (Many-to-Many) ====================
        `CREATE TABLE IF NOT EXISTS card_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            user_id INT NOT NULL,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            INDEX idx_card (card_id),
            INDEX idx_user (user_id),
            UNIQUE KEY unique_card_user (card_id, user_id),
            
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== CARD_MEDIA TABELLE ====================
        `CREATE TABLE IF NOT EXISTS card_media (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            type ENUM('image', 'video') NOT NULL,
            url VARCHAR(500) NOT NULL,
            filename VARCHAR(255),
            size INT DEFAULT 0,
            
            uploaded_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            INDEX idx_card (card_id),
            
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== SUBTASKS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS subtasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            card_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            position INT DEFAULT 0,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_card (card_id),
            INDEX idx_position (position),
            
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
        
        // ==================== BOARD_PERMISSIONS TABELLE ====================
        `CREATE TABLE IF NOT EXISTS board_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            board_id INT NOT NULL,
            organisation_id INT DEFAULT 2 COMMENT 'Immer Team (ID=2)',
            
            -- Ziel (entweder group_id ODER role_id ODER user_id)
            group_id INT DEFAULT NULL,
            role_id INT DEFAULT NULL,
            user_id INT DEFAULT NULL,
            
            -- Granulare Berechtigungen (Flags)
            can_view BOOLEAN DEFAULT TRUE,
            can_create_card BOOLEAN DEFAULT FALSE,
            can_edit_card BOOLEAN DEFAULT FALSE,
            can_delete_card BOOLEAN DEFAULT FALSE,
            can_move_card BOOLEAN DEFAULT FALSE,
            can_create_category BOOLEAN DEFAULT FALSE,
            can_edit_category BOOLEAN DEFAULT FALSE,
            can_delete_category BOOLEAN DEFAULT FALSE,
            can_manage_permissions BOOLEAN DEFAULT FALSE,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            INDEX idx_board (board_id),
            INDEX idx_group (group_id),
            INDEX idx_role (role_id),
            INDEX idx_user (user_id),
            
            FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
            FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
            FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            
            -- Nur eines der Ziele darf gesetzt sein
            CHECK ((group_id IS NOT NULL AND role_id IS NULL AND user_id IS NULL) OR
                   (group_id IS NULL AND role_id IS NOT NULL AND user_id IS NULL) OR
                   (group_id IS NULL AND role_id IS NULL AND user_id IS NOT NULL))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    // Tabellen in korrekter Reihenfolge erstellen (wegen Foreign Keys)
    const orderedQueries = [
        queries[1], // organisations (keine FK)
        queries[2], // groups (FK zu organisations)
        queries[3], // roles (FK zu groups)
        queries[0], // users (FK zu organisations, groups, roles)
        queries[4], // tasks (FK zu users, organisations, groups)
        queries[5], // projects (FK zu organisations, users)
        queries[6], // boards (FK zu organisations, users)
        queries[7], // categories (FK zu boards)
        queries[8], // cards (FK zu categories, boards, users)
        queries[9], // tags (FK zu boards)
        queries[10], // card_tags (FK zu cards, tags)
        queries[11], // card_assignments (FK zu cards, users)
        queries[12], // card_media (FK zu cards, users)
        queries[13], // subtasks (FK zu cards)
        queries[14]  // board_permissions (FK zu boards, organisations, groups, roles, users)
    ];

    for (const query of orderedQueries) {
        const result = await executeQuery(query);
        if (!result.success) {
            console.error('Failed to create table:', result.error);
        }
    }
    
    // ==================== MIGRATIONS ====================
    // Füge position Spalte zu boards hinzu, falls nicht vorhanden
    await executeQuery(`
        ALTER TABLE boards 
        ADD COLUMN IF NOT EXISTS position INT DEFAULT 0,
        ADD INDEX IF NOT EXISTS idx_position (position)
    `);
    
    // Standard-Daten erstellen (falls nicht vorhanden)
    await seedDefaultData();
    
    console.log('✓ Datenbank-Tabellen initialisiert');
}

// Standard-Daten einfügen
async function seedDefaultData() {
    // Standard Organisation
    await executeQuery(`
        INSERT IGNORE INTO organisations (id, name, description, color)
        VALUES (1, 'Standard', 'Standard Organisation für neue User', '#3B82F6')
    `);
    
    // Standard Group
    await executeQuery(`
        INSERT IGNORE INTO \`groups\` (id, organisation_id, name, description, color)
        VALUES (1, 1, 'Mitglieder', 'Standard Gruppe', '#10B981')
    `);
    
    // Standard Roles
    await executeQuery(`
        INSERT IGNORE INTO roles (id, group_id, name, description, permissions, priority, color)
        VALUES 
        (1, 1, 'User', 'Standard Benutzer', '["tasks.view", "profile.edit"]', 1, '#6B7280'),
        (2, 1, 'Moderator', 'Moderator Rechte', '["tasks.view", "tasks.create", "tasks.edit", "profile.edit"]', 50, '#8B5CF6'),
        (3, 1, 'Admin', 'Administrator Rechte', '["*"]', 100, '#EF4444')
    `);
}

module.exports = {
    pool,
    executeQuery,
    testConnection,
    initializeDatabase
};
