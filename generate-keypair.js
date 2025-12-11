/**
 * Generiere RSA Keypair für Discourse User API
 * Führe einmalig aus: node generate-keypair.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('Generiere RSA Keypair für Discourse User API...\n');

// Generiere Keypair
crypto.generateKeyPair('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
}, (err, publicKey, privateKey) => {
    if (err) {
        console.error('❌ Fehler beim Generieren:', err);
        process.exit(1);
    }
    
    // Speichere Private Key
    const keypairPath = path.join(__dirname, 'keypair.pem');
    fs.writeFileSync(keypairPath, privateKey, 'utf8');
    
    console.log('✅ Keypair erfolgreich generiert!');
    console.log('📁 Gespeichert als: keypair.pem');
    console.log('\n⚠️  WICHTIG: Fügen Sie keypair.pem zur .gitignore hinzu!');
    console.log('⚠️  Der Private Key darf NIEMALS committet werden!\n');
    
    console.log('Public Key (zur Info):');
    console.log('─'.repeat(50));
    console.log(publicKey);
    console.log('─'.repeat(50));
});
