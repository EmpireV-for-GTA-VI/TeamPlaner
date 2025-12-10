/**
 * ============================================================================
 * Database Migration Script
 * ============================================================================
 * 
 * Führt das SQL-Schema gegen die PostgreSQL-Datenbank aus
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'teamplaner',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
    });

    try {
        console.log('Starting database migration...');

        // Lese SQL-Schema
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Führe Schema aus
        await pool.query(schema);

        console.log('✓ Database migration completed successfully');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);

    } finally {
        await pool.end();
    }
}

migrate();
