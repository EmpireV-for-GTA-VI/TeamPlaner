const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const forge = require('node-forge');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../database');

// Discourse Forum URL
const FORUM_URL = 'https://forum.cfx.re';

// Keypair Pfad
const KEYPAIR_PATH = path.join(__dirname, '..', 'keypair.pem');

/**
 * Lade Private Key aus keypair.pem
 */
function loadPrivateKey() {
    try {
        return fs.readFileSync(KEYPAIR_PATH, 'utf8');
    } catch (error) {
        throw new Error('keypair.pem nicht gefunden! Bitte generieren: openssl genrsa -out keypair.pem 2048');
    }
}

/**
 * Extrahiere Public Key aus Private Key
 */
function extractPublicKey(privateKey) {
    const keyObject = crypto.createPrivateKey(privateKey);
    const publicKey = crypto.createPublicKey(keyObject);
    
    return publicKey.export({
        type: 'spki',
        format: 'pem'
    });
}

/**
 * GET /auth/redirect
 * Initiiert den Discourse User API Flow
 */
router.get('/redirect', (req, res) => {
    try {
        // 1. Lade Private Key und extrahiere Public Key
        const privateKey = loadPrivateKey();
        const publicKey = extractPublicKey(privateKey);
        
        // 2. Generiere zufällige Nonce (32 Bytes = 64 Hex-Zeichen)
        const nonce = crypto.randomBytes(32).toString('hex');
        
        // 3. Generiere zufällige Client ID (48 Bytes = 96 Hex-Zeichen)
        const clientId = crypto.randomBytes(48).toString('hex');
        
        // 4. Speichere in Session
        req.session.nonce = nonce;
        req.session.clientId = clientId;
        
        // 5. Baue Query-String
        const params = new URLSearchParams({
            auth_redirect: process.env.CFX_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/auth/callback`,
            application_name: process.env.APP_NAME || 'TeamPlaner',
            scopes: 'session_info',
            client_id: clientId,
            nonce: nonce,
            public_key: publicKey
        });
        
        // 6. Baue Authorization URL
        const authUrl = `${FORUM_URL}/user-api-key/new?${params.toString()}`;
        
        console.log('✓ Discourse Auth initiated for session:', req.session.id);
        
        // Redirect zu Discourse Forum
        res.redirect(authUrl);
        
    } catch (error) {
        console.error('Auth Redirect Error:', error);
        res.status(500).send(`
            <h1>Authentication Error</h1>
            <p>${error.message}</p>
            <p><a href="/">Return to Home</a></p>
        `);
    }
});

/**
 * GET /auth/callback
 * Discourse User API Callback - Entschlüsselt Payload und holt User-Daten
 */
router.get('/callback', async (req, res) => {
    const { payload } = req.query;
    
    try {
        // 1. Validiere Payload
        if (!payload) {
            throw new Error('No payload received from Discourse');
        }
        
        console.log('🔍 Debug - Payload Length:', payload.length);
        console.log('🔍 Debug - Payload (first 100 chars):', payload.substring(0, 100));
        console.log('🔍 Debug - Session Nonce:', req.session.nonce);
        console.log('🔍 Debug - Session ClientId:', req.session.clientId);
        
        // 2. Lade Private Key
        const privateKeyPem = loadPrivateKey();
        
        // 3. Decode Base64 Payload
        const encryptedBase64 = payload;
        console.log('🔍 Debug - Encrypted Base64 Length:', encryptedBase64.length);
        
        // 4. Entschlüssele mit node-forge (reine JS, unterstützt PKCS1 v1.5)
        let decryptedData;
        try {
            // Parse Private Key mit node-forge
            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            
            // Decode Base64 zu Bytes
            const encryptedBytes = forge.util.decode64(encryptedBase64);
            
            // Entschlüssele mit PKCS1 v1.5 Padding (Discourse Standard)
            const decryptedBytes = privateKey.decrypt(encryptedBytes, 'RSAES-PKCS1-V1_5');
            
            console.log('✓ Decryption successful');
            console.log('🔍 Debug - Decrypted Text:', decryptedBytes);
            
            decryptedData = JSON.parse(decryptedBytes);
        } catch (decryptError) {
            console.error('❌ Decryption failed:', decryptError.message);
            console.error('Stack:', decryptError.stack);
            throw new Error(`Decryption failed: ${decryptError.message}`);
        }
        
        // 5. Validiere Nonce (CSRF Protection)
        if (!req.session.nonce || decryptedData.nonce !== req.session.nonce) {
            throw new Error('Invalid nonce - possible CSRF attack');
        }
        
        // 7. Extrahiere API Key
        const apiKey = decryptedData.key;
        const clientId = req.session.clientId;
        
        if (!apiKey) {
            throw new Error('No API key received from Discourse');
        }
        
        console.log('✓ Payload decrypted successfully');
        console.log('🔍 Decrypted Payload Data:', JSON.stringify(decryptedData, null, 2));
        
        // 8. Hole User-Daten von Discourse
        const userInfoResponse = await axios.get(`${FORUM_URL}/session/current.json`, {
            headers: {
                'User-Api-Key': apiKey,
                'User-Api-Client-Id': clientId
            }
        });
        
        console.log('🔍 Full User Info Response:', JSON.stringify(userInfoResponse.data, null, 2));
        
        const currentUser = userInfoResponse.data.current_user;
        
        if (!currentUser) {
            throw new Error('No user data received from Discourse');
        }
        
        // 9. Speichere User in Session (mit allen verfügbaren Daten)
        req.session.user = {
            // Basis-Daten
            id: currentUser.id,
            name: currentUser.username,
            displayName: currentUser.name || currentUser.username,
            
            // Avatar
            avatar: currentUser.avatar_template 
                ? `${FORUM_URL}${currentUser.avatar_template.replace('{size}', '120')}`
                : null,
            
            // Zusätzliche Discourse-Daten
            trust_level: currentUser.trust_level,
            admin: currentUser.admin || false,
            moderator: currentUser.moderator || false,
            
            // CFX-spezifische Daten (falls vorhanden)
            custom_fields: currentUser.custom_fields || {},
            
            // Auth-Daten
            authenticated: true,
            loginTime: new Date().toISOString(),
            apiKey: apiKey,
            clientId: clientId,
            
            // Alle Raw-Daten für Debug
            _raw: currentUser
        };
        
        console.log('✓ User Session Created:', {
            id: req.session.user.id,
            name: req.session.user.name,
            admin: req.session.user.admin,
            trust_level: req.session.user.trust_level
        });
        
        // 10. Lösche verwendete Nonce (One-Time-Use)
        delete req.session.nonce;
        
        // 11. Speichere/Update User in Datenbank
        await executeQuery(
            `INSERT INTO users_web (cfx_name, last_seen, connected_identifier) 
             VALUES (?, NOW(), ?) 
             ON DUPLICATE KEY UPDATE last_seen = NOW(), cfx_name = ?`,
            [currentUser.username, currentUser.id.toString(), currentUser.username]
        );
        
        console.log('✓ User authenticated:', currentUser.username);
        
        // 12. Redirect zum Dashboard
        res.redirect('/#/home?login=success');
        
    } catch (error) {
        console.error('Auth Callback Error:', error.message);
        
        // Cleanup Session
        delete req.session.nonce;
        delete req.session.clientId;
        
        res.status(500).send(`
            <h1>Authentication Failed</h1>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Details:</strong> ${error.response?.data || 'No additional details'}</p>
            <hr>
            <p><a href="/">Return to Home</a></p>
            <p><a href="/auth/redirect">Try Again</a></p>
        `);
    }
});

/**
 * GET /auth/me
 * Gibt aktuellen authentifizierten User zurück
 */
router.get('/me', (req, res) => {
    if (req.session && req.session.user && req.session.user.authenticated) {
        res.json({
            success: true,
            authenticated: true,
            user: req.session.user  // Gebe alle User-Daten zurück
        });
    } else {
        res.json({ 
            success: false,
            authenticated: false 
        });
    }
});

/**
 * POST /auth/logout
 * Logout - Zerstört Session
 */
router.post('/logout', (req, res) => {
    const username = req.session.user?.name || 'Unknown';
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Logout failed' 
            });
        }
        
        console.log('✓ User logged out:', username);
        res.json({ success: true });
    });
});

module.exports = router;
