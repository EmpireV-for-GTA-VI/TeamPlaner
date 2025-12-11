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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    // Tabellen in korrekter Reihenfolge erstellen (wegen Foreign Keys)
    const orderedQueries = [
        queries[1], // organisations (keine FK)
        queries[2], // groups (FK zu organisations)
        queries[3], // roles (FK zu groups)
        queries[0], // users (FK zu organisations, groups, roles)
        queries[4], // tasks (FK zu users, organisations, groups)
        queries[5]  // projects (FK zu organisations, users)
    ];

    for (const query of orderedQueries) {
        const result = await executeQuery(query);
        if (!result.success) {
            console.error('Failed to create table:', result.error);
        }
    }
    
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
