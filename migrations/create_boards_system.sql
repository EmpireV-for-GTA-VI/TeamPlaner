-- Neues Boards-System für TaskPlanner
-- Vollständiges Datenbank-Schema

-- 1. BOARDS Tabelle
CREATE TABLE IF NOT EXISTS boards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex Color
    icon VARCHAR(50) NULL, -- Emoji oder Icon-Name
    
    -- Berechtigungen
    is_public BOOLEAN DEFAULT FALSE, -- Öffentlich für alle?
    created_by INT NOT NULL, -- User ID des Erstellers
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BOARD_PERMISSIONS Tabelle
-- Definiert welche Gruppen/Rollen Zugriff auf Boards haben
CREATE TABLE IF NOT EXISTS board_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    board_id INT NOT NULL,
    
    -- Entweder Organisation, Gruppe oder Rolle (mindestens eins muss gesetzt sein)
    organisation_id INT NULL,
    group_id INT NULL,
    role_id INT NULL,
    
    -- Berechtigungslevel
    permission_level ENUM('view', 'edit', 'admin') DEFAULT 'view',
    -- view: Nur lesen
    -- edit: Lesen + Karten erstellen/bearbeiten/verschieben
    -- admin: Alles + Board-Einstellungen ändern + Kategorien verwalten
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    
    INDEX idx_board_id (board_id),
    INDEX idx_organisation_id (organisation_id),
    INDEX idx_group_id (group_id),
    INDEX idx_role_id (role_id),
    
    -- Stelle sicher, dass nicht mehrfach dieselbe Permission existiert
    UNIQUE KEY unique_permission (board_id, organisation_id, group_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CATEGORIES Tabelle (früher "Boards" im alten System)
-- Kategorien sind Spalten innerhalb eines Boards (To Do, In Progress, Done)
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    board_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    position INT DEFAULT 0, -- Reihenfolge der Kategorien
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    INDEX idx_board_id (board_id),
    INDEX idx_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CARDS Tabelle
-- Einzelne Karten/Tasks innerhalb einer Kategorie
CREATE TABLE IF NOT EXISTS cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    board_id INT NOT NULL, -- Für schnellere Queries
    
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    
    -- Position in der Kategorie (für Drag & Drop Reihenfolge)
    position INT DEFAULT 0,
    
    -- Zuweisungen
    assigned_to INT NULL, -- User ID
    created_by INT NOT NULL, -- User ID
    
    -- Status/Priority (optional)
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    
    -- Timestamps
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CARD_COMMENTS Tabelle (optional, für Kommentare auf Karten)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Standard-Daten einfügen
-- Standard-Board für alle
INSERT INTO boards (name, description, color, icon, is_public, created_by) 
VALUES 
('Standard Board', 'Öffentliches Board für alle Mitglieder', '#3B82F6', '📋', TRUE, 1);

-- Standard-Kategorien
INSERT INTO categories (board_id, name, color, position) 
VALUES 
(1, 'To Do', '#EF4444', 0),
(1, 'In Progress', '#F59E0B', 1),
(1, 'Review', '#8B5CF6', 2),
(1, 'Done', '#10B981', 3);

-- Beispiel-Karten
INSERT INTO cards (category_id, board_id, title, description, created_by, priority) 
VALUES 
(1, 1, 'Willkommen!', 'Dies ist eine Beispiel-Karte. Du kannst sie bearbeiten oder löschen.', 1, 'medium'),
(1, 1, 'Neue Karte erstellen', 'Klicke auf "+ Karte" um eine neue Aufgabe hinzuzufügen.', 1, 'low'),
(4, 1, 'System-Setup', 'Datenbank wurde erfolgreich eingerichtet!', 1, 'high');
