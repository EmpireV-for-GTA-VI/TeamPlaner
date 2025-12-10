/**
 * ============================================================================
 * SpiceDB Schema Upload Script
 * ============================================================================
 * 
 * Lädt das .zed Schema in SpiceDB hoch
 */

const { v1 } = require('@authzed/authzed-node');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function uploadSchema() {
    try {
        console.log('Uploading SpiceDB schema...');

        const endpoint = process.env.SPICEDB_ENDPOINT || 'localhost:50051';
        const token = process.env.SPICEDB_TOKEN || 'insecure-token';

        const client = v1.NewClient(
            token,
            endpoint,
            v1.ClientSecurity.INSECURE_PLAINTEXT_CREDENTIALS
        );

        // Lese Schema
        const schemaPath = path.join(__dirname, '../spicedb/schema.zed');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Upload Schema
        const request = v1.WriteSchemaRequest.create({
            schema: schema
        });

        await client.schema.writeSchema(request);

        console.log('✓ SpiceDB schema uploaded successfully');

    } catch (error) {
        console.error('Schema upload failed:', error);
        process.exit(1);
    }
}

uploadSchema();
