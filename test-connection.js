const mariadb = require('mariadb');
require('dotenv').config();

console.log('=== MariaDB Verbindungstest ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-2) : 'NICHT GESETZT');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('');

async function testDirectConnection() {
    console.log('Teste direkte Verbindung...');
    let conn;
    try {
        conn = await mariadb.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectTimeout: 10000,
            allowPublicKeyRetrieval: true
        });
        console.log('✓ Verbindung zum Server erfolgreich!');
        
        // Teste Datenbankzugriff
        await conn.query(`USE ${process.env.DB_NAME}`);
        console.log(`✓ Datenbank "${process.env.DB_NAME}" erreichbar!`);
        
        // Zeige Version
        const rows = await conn.query('SELECT VERSION() as version');
        console.log('✓ MariaDB Version:', rows[0].version);
        
        console.log('\n=== Alle Tests erfolgreich! ===');
        return true;
    } catch (err) {
        console.error('\n✗ Fehler:', err.message);
        console.error('\nFehlerdetails:');
        console.error('Code:', err.code);
        console.error('Errno:', err.errno);
        console.error('SQLState:', err.sqlState);
        
        if (err.code === 'ECONNREFUSED') {
            console.error('\n⚠️  Der MariaDB Server läuft nicht oder ist unter dieser Adresse nicht erreichbar.');
            console.error('   Prüfen Sie: mysqld Status, Port 3306, Firewall');
        } else if (err.errno === 1045) {
            console.error('\n⚠️  Benutzername oder Passwort falsch.');
        } else if (err.errno === 1049) {
            console.error('\n⚠️  Datenbank existiert nicht.');
        }
        
        return false;
    } finally {
        if (conn) await conn.end();
    }
}

testDirectConnection().then(() => process.exit(0)).catch(() => process.exit(1));
