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

// Datenbank initialisieren (Beispiel-Tabellen)
async function initializeDatabase() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
            assignee VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS users_web (
            cfx_name varchar(155) DEFAULT NULL,
            last_seen datetime DEFAULT NULL,
            organisation varchar(20) DEFAULT NULL,
            \`group\` varchar(20) DEFAULT NULL,
            role varchar(55) DEFAULT NULL,
            connected_identifier varchar(155) DEFAULT NULL,
            PRIMARY KEY (connected_identifier)
        )`,
        `CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            start_date DATE,
            end_date DATE,
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const query of queries) {
        await executeQuery(query);
    }
    console.log('✓ Datenbank-Tabellen initialisiert');
}

module.exports = {
    pool,
    executeQuery,
    testConnection,
    initializeDatabase
};
