-- Discord Integration für Profilbilder
-- Fügt Discord-Felder zur users Tabelle hinzu

ALTER TABLE users 
ADD COLUMN discord_id VARCHAR(100) UNIQUE NULL AFTER fivem_id,
ADD COLUMN discord_username VARCHAR(100) NULL AFTER discord_id,
ADD COLUMN discord_avatar VARCHAR(500) NULL AFTER discord_username,
ADD COLUMN discord_access_token TEXT NULL AFTER discord_avatar,
ADD COLUMN discord_refresh_token TEXT NULL AFTER discord_access_token,
ADD COLUMN discord_linked_at DATETIME NULL AFTER discord_refresh_token,
ADD COLUMN custom_avatar_url VARCHAR(500) NULL AFTER avatar_url,
ADD COLUMN avatar_source ENUM('cfx', 'discord', 'custom') DEFAULT 'cfx' AFTER custom_avatar_url;

-- Kommentar für Spalten
ALTER TABLE users 
MODIFY COLUMN discord_id VARCHAR(100) UNIQUE NULL COMMENT 'Discord User ID',
MODIFY COLUMN discord_username VARCHAR(100) NULL COMMENT 'Discord Username',
MODIFY COLUMN discord_avatar VARCHAR(500) NULL COMMENT 'Discord Avatar Hash',
MODIFY COLUMN discord_access_token TEXT NULL COMMENT 'Discord OAuth Access Token (encrypted)',
MODIFY COLUMN discord_refresh_token TEXT NULL COMMENT 'Discord OAuth Refresh Token (encrypted)',
MODIFY COLUMN discord_linked_at DATETIME NULL COMMENT 'Zeitpunkt der Discord-Verknüpfung',
MODIFY COLUMN custom_avatar_url VARCHAR(500) NULL COMMENT 'Custom uploaded avatar URL',
MODIFY COLUMN avatar_source ENUM('cfx', 'discord', 'custom') DEFAULT 'cfx' COMMENT 'Quelle des aktuellen Avatars';
