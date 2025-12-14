const { executeQuery } = require('../database');

async function runMigration() {
    console.log('🔄 Starting Discord fields migration...');
    
    try {
        // Add discord_id
        await executeQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS discord_id VARCHAR(100) UNIQUE NULL AFTER fivem_id
        `);
        console.log('✅ Added discord_id column');
        
        // Add discord_username
        await executeQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS discord_username VARCHAR(100) NULL AFTER discord_id
        `);
        console.log('✅ Added discord_username column');
        
        // Add discord_avatar
        await executeQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS discord_avatar VARCHAR(500) NULL AFTER discord_username
        `);
        console.log('✅ Added discord_avatar column');
        
        // Add discord_access_token
        await executeQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS discord_access_token TEXT NULL AFTER discord_avatar
        `);
        console.log('✅ Added discord_access_token column');
        
        // Add discord_refresh_token
        await executeQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS discord_refresh_token TEXT NULL AFTER discord_access_token
        `);
        console.log('✅ Added discord_refresh_token column');
        
        // Add discord_linked_at
        await executeQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS discord_linked_at DATETIME NULL AFTER discord_refresh_token
        `);
        console.log('✅ Added discord_linked_at column');
        
        // Add custom_avatar_url
        await executeQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS custom_avatar_url VARCHAR(500) NULL AFTER avatar_url
        `);
        console.log('✅ Added custom_avatar_url column');
        
        // Add avatar_source
        await executeQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS avatar_source ENUM('cfx', 'discord', 'custom') DEFAULT 'cfx' AFTER custom_avatar_url
        `);
        console.log('✅ Added avatar_source column');
        
        console.log('🎉 Migration completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
