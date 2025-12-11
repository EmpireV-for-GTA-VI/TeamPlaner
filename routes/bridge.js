const express = require('express');
const router = express.Router();
const playerManager = require('../utils/playerManager');

/**
 * Middleware: Bridge Token Authentifizierung
 * Prüft ob Request von FiveM Server kommt
 */
function verifyBridgeToken(req, res, next) {
    const token = req.headers['x-bridge-token'];
    const expectedToken = process.env.BRIDGE_TOKEN;

    if (!expectedToken) {
        console.error('❌ BRIDGE_TOKEN not configured in .env!');
        return res.status(500).json({
            success: false,
            error: 'Server configuration error'
        });
    }

    if (!token || token !== expectedToken) {
        console.warn('⚠️  Unauthorized bridge request from:', req.ip);
        return res.status(401).json({
            success: false,
            error: 'Invalid bridge token'
        });
    }

    next();
}

/**
 * POST /api/bridge/events/join
 * FiveM meldet: Spieler ist beigetreten
 */
router.post('/events/join', verifyBridgeToken, (req, res) => {
    const { source, fivemId, name, timestamp } = req.body;

    // Validierung
    if (!fivemId || !name || !source) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: fivemId, name, source'
        });
    }

    // Spieler zur Online-Liste hinzufügen
    playerManager.addPlayer(fivemId, { source, name });

    console.log(`🎮 [FiveM Bridge] Player joined: ${name} (ID: ${fivemId}, Source: ${source})`);

    res.json({
        success: true,
        message: 'Player join event received',
        playerCount: playerManager.getPlayerCount()
    });
});

/**
 * POST /api/bridge/events/leave
 * FiveM meldet: Spieler hat Server verlassen
 */
router.post('/events/leave', verifyBridgeToken, (req, res) => {
    const { source, fivemId, name, reason } = req.body;

    // Validierung
    if (!fivemId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required field: fivemId'
        });
    }

    // Spieler von Online-Liste entfernen
    const removed = playerManager.removePlayer(fivemId);

    console.log(`👋 [FiveM Bridge] Player left: ${name || 'Unknown'} (ID: ${fivemId}) - Reason: ${reason || 'Unknown'}`);

    res.json({
        success: true,
        message: 'Player leave event received',
        removed: removed,
        playerCount: playerManager.getPlayerCount()
    });
});

/**
 * GET /api/bridge/players
 * Liste aller aktuell online Spieler (Admin only)
 */
router.get('/players', verifyBridgeToken, (req, res) => {
    const players = playerManager.getAllPlayers();

    res.json({
        success: true,
        count: players.length,
        players: players
    });
});

/**
 * GET /api/bridge/status
 * Bridge Status Check (Admin only)
 */
router.get('/status', verifyBridgeToken, (req, res) => {
    res.json({
        success: true,
        status: 'online',
        playerCount: playerManager.getPlayerCount(),
        uptime: process.uptime()
    });
});

/**
 * DELETE /api/bridge/players
 * Lösche alle Online-Spieler (für Server-Restart)
 */
router.delete('/players', verifyBridgeToken, (req, res) => {
    playerManager.clear();

    res.json({
        success: true,
        message: 'All players cleared'
    });
});

module.exports = router;
