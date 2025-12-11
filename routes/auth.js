const express = require('express');
const router = express.Router();
const DiscourseUserAPI = require('../discourse-auth');
const { executeQuery } = require('../database');
const crypto = require('crypto');

const discourseAuth = new DiscourseUserAPI();

// Initialisiere Keypair beim Start
(async () => {
    await discourseAuth.generateKeypair();
    console.log('✓ Discourse Keypair generiert');
})();

// Login-Route - Leitet zum CFX Forum weiter
router.get('/login', (req, res) => {
    try {
        // Generiere State (Nonce) und Client ID
        const nonce = crypto.randomBytes(16).toString('hex');
        const clientId = crypto.randomBytes(48).toString('hex');
        
        // Speichere in Session
        req.session.authNonce = nonce;
        req.session.authClientId = clientId;
        
        // Generiere Authorization URL
        const authUrl = discourseAuth.getAuthorizationUrl(
            process.env.CFX_REDIRECT_URI || 'http://localhost:3000/auth/callback',
            process.env.APPLICATION_NAME || 'TeamPlaner',
            nonce,
            clientId
        );
        
        res.redirect(authUrl);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to initiate login' });
    }
});

// OAuth Callback - CFX Forum leitet hierhin zurück
router.get('/callback', async (req, res) => {
    const { payload } = req.query;

    if (!payload) {
        return res.status(400).json({ error: 'No payload received' });
    }

    try {
        // Entschlüssele Payload
        const decrypted = discourseAuth.decryptPayload(payload);
        
        // Validiere Nonce
        if (decrypted.nonce !== req.session.authNonce) {
            return res.status(403).json({ error: 'Invalid nonce' });
        }

        const apiKey = decrypted.key;
        const clientId = req.session.authClientId;

        // Hole Benutzerinformationen
        const userResult = await discourseAuth.getUserInfo(apiKey, clientId);

        if (!userResult.success) {
            return res.status(500).json({ error: 'Failed to get user info', details: userResult.error });
        }

        const currentUser = userResult.data.current_user;

        // Benutzer in Session speichern
        req.session.user = {
            cfx_id: currentUser.id,
            cfx_name: currentUser.username,
            avatar: currentUser.avatar_template,
            authenticated: true,
            apiKey: apiKey,
            clientId: clientId
        };

        // Benutzer in Datenbank speichern/aktualisieren
        await executeQuery(
            `INSERT INTO users_web (cfx_name, last_seen, connected_identifier) 
             VALUES (?, NOW(), ?) 
             ON DUPLICATE KEY UPDATE last_seen = NOW(), cfx_name = ?`,
            [currentUser.username, currentUser.id.toString(), currentUser.username]
        );

        // Weiterleitung zur Hauptseite
        res.redirect('/?login=success');
    } catch (error) {
        console.error('Auth callback error:', error);
        res.status(500).json({ error: 'Authentication failed', details: error.message });
    }
});

// Logout-Route
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.redirect('/?logout=success');
    });
});

// Aktuellen Benutzer abrufen
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
