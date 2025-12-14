const { executeQuery } = require('../database');

async function runMigration() {
    console.log('🔄 Starting Boards System migration...');
    
    try {
        // 1. Boards Tabelle
        console.log('📋 Creating boards table...');
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS boards (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT NULL,
                color VARCHAR(7) DEFAULT '#3B82F6',
                icon VARCHAR(50) NULL,
                is_public BOOLEAN DEFAULT FALSE,
                created_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_created_by (created_by)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Boards table created');
        
        // 2. Board Permissions Tabelle
        console.log('🔐 Creating board_permissions table...');
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS board_permissions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                board_id INT NOT NULL,
                organisation_id INT NULL,
                group_id INT NULL,
                role_id INT NULL,
                permission_level ENUM('view', 'edit', 'admin') DEFAULT 'view',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
                FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                INDEX idx_board_id (board_id),
                INDEX idx_organisation_id (organisation_id),
                INDEX idx_group_id (group_id),
                INDEX idx_role_id (role_id),
                UNIQUE KEY unique_permission (board_id, organisation_id, group_id, role_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Board permissions table created');
        
        // 3. Categories Tabelle
        console.log('📂 Creating categories table...');
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT PRIMARY KEY AUTO_INCREMENT,
                board_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT NULL,
                color VARCHAR(7) DEFAULT '#3B82F6',
                position INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
                INDEX idx_board_id (board_id),
                INDEX idx_position (position)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Categories table created');
        
        // 4. Cards Tabelle
        console.log('🎴 Creating cards table...');
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS cards (
                id INT PRIMARY KEY AUTO_INCREMENT,
                category_id INT NOT NULL,
                board_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                position INT DEFAULT 0,
                assigned_to INT NULL,
                created_by INT NOT NULL,
                priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                due_date DATETIME NULL,
                completed_at DATETIME NULL,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_category_id (category_id),
                INDEX idx_board_id (board_id),
                INDEX idx_position (position),
                INDEX idx_assigned_to (assigned_to),
                INDEX idx_created_by (created_by)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Cards table created');
        
        // 5. Card Comments Tabelle
        console.log('💬 Creating card_comments table...');
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS card_comments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                card_id INT NOT NULL,
                user_id INT NOT NULL,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_card_id (card_id),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Card comments table created');
        
        // 6. Standard-Daten einfügen
        console.log('📝 Inserting default data...');
        
        // Prüfe ob Standard-Board existiert
        const existingBoards = await executeQuery('SELECT COUNT(*) as count FROM boards');
        
        if (existingBoards.data[0].count === 0) {
            // Standard Board
            await executeQuery(`
                INSERT INTO boards (name, description, color, icon, is_public, created_by) 
                VALUES ('Standard Board', 'Öffentliches Board für alle Mitglieder', '#3B82F6', '📋', TRUE, 1)
            `);
            console.log('✅ Default board created');
            
            // Standard Kategorien
            await executeQuery(`
                INSERT INTO categories (board_id, name, color, position) 
                VALUES 
                (1, 'To Do', '#EF4444', 0),
                (1, 'In Progress', '#F59E0B', 1),
                (1, 'Review', '#8B5CF6', 2),
                (1, 'Done', '#10B981', 3)
            `);
            console.log('✅ Default categories created');
            
            // Beispiel-Karten
            await executeQuery(`
                INSERT INTO cards (category_id, board_id, title, description, created_by, priority) 
                VALUES 
                (1, 1, 'Willkommen!', 'Dies ist eine Beispiel-Karte. Du kannst sie bearbeiten oder löschen.', 1, 'medium'),
                (1, 1, 'Neue Karte erstellen', 'Klicke auf "+ Karte" um eine neue Aufgabe hinzuzufügen.', 1, 'low'),
                (4, 1, 'System-Setup', 'Datenbank wurde erfolgreich eingerichtet!', 1, 'high')
            `);
            console.log('✅ Example cards created');
        } else {
            console.log('ℹ️  Default data already exists, skipping...');
        }
        
        console.log('🎉 Boards System migration completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

runMigration();
