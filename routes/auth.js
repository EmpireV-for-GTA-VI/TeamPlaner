const express = require('express');
const router = express.Router();
const CFXAuth = require('../cfx-auth');
const { executeQuery } = require('../database');

const cfxAuth = new CFXAuth(
    process.env.CFX_CLIENT_ID,
    process.env.CFX_CLIENT_SECRET,
    process.env.CFX_REDIRECT_URI
);

// Login-Route - Leitet zum CFX OAuth weiter
router.get('/login', (req, res) => {
    const state = Math.random().toString(36).substring(7);
    req.session.oauthState = state;
    const authUrl = cfxAuth.getAuthorizationUrl(state);
    res.redirect(authUrl);
});

// OAuth Callback - CFX leitet hierhin zurück
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    // State validieren (CSRF-Schutz)
    if (state !== req.session.oauthState) {
        return res.status(403).json({ error: 'Invalid state parameter' });
    }

    if (!code) {
        return res.status(400).json({ error: 'No authorization code received' });
    }

    try {
        // Authentifizierung durchführen
        const result = await cfxAuth.authenticate(code);

        if (!result.success) {
            return res.status(500).json({ error: 'Authentication failed', details: result.error });
        }

        // Benutzer in Session speichern
        req.session.user = {
            cfx_id: result.user.sub,
            cfx_name: result.user.name || result.user.preferred_username,
            avatar: result.user.picture,
            authenticated: true
        };

        // Benutzer in Datenbank speichern/aktualisieren
        await executeQuery(
            `INSERT INTO users_web (cfx_name, last_seen, connected_identifier) 
             VALUES (?, NOW(), ?) 
             ON DUPLICATE KEY UPDATE last_seen = NOW()`,
            [req.session.user.cfx_name, result.user.sub]
        );

        // Weiterleitung zur Hauptseite
        res.redirect('/?login=success');
    } catch (error) {
        console.error('Auth callback error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
