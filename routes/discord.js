const express = require('express');
const router = express.Router();
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const userService = require('../services/userService');

// Discord OAuth2 Configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_CALLBACK_URL = process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback';

// Passport Discord Strategy
if (DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
        callbackURL: DISCORD_CALLBACK_URL,
        scope: ['identify', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Profile enthält Discord-Daten
            const discordData = {
                discordId: profile.id,
                discordUsername: profile.username,
                discordAvatar: profile.avatar,
                accessToken: accessToken,
                refreshToken: refreshToken
            };
            
            return done(null, discordData);
        } catch (error) {
            return done(error, null);
        }
    }));
}

/**
 * GET /auth/discord
 * Startet Discord OAuth Flow
 */
router.get('/discord', (req, res, next) => {
    // Prüfe ob User eingeloggt ist
    if (!req.session?.user?.authenticated) {
        return res.status(401).json({
            success: false,
            error: 'You must be logged in to link Discord'
        });
    }
    
    // Speichere User-ID in Session für Callback
    req.session.linkingUserId = req.session.user.id;
    
    // Starte OAuth Flow
    passport.authenticate('discord')(req, res, next);
});

/**
 * GET /auth/discord/callback
 * Discord OAuth Callback
 */
router.get('/discord/callback', 
    passport.authenticate('discord', { session: false, failureRedirect: '/profile?discord=error' }),
    async (req, res) => {
        try {
            // User-ID aus Session holen
            const userId = req.session.linkingUserId;
            
            if (!userId) {
                return res.redirect('/profile?discord=no_session');
            }
            
            // Discord-Daten aus Passport
            const discordData = req.user;
            
            // Verknüpfe Discord mit User
            await userService.linkDiscord(userId, discordData);
            
            // Cleanup Session
            delete req.session.linkingUserId;
            
            // Aktualisiere User in Session
            const updatedUser = await userService.findById(userId);
            req.session.user = {
                ...req.session.user,
                ...updatedUser
            };
            
            // Redirect zum Profil
            res.redirect('/profile?discord=success');
            
        } catch (error) {
            console.error('Discord callback error:', error);
            res.redirect('/profile?discord=error');
        }
    }
);

/**
 * POST /auth/discord/unlink
 * Discord-Verknüpfung aufheben
 */
router.post('/discord/unlink', async (req, res) => {
    try {
        if (!req.session?.user?.authenticated) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        const userId = req.session.user.id;
        
        // Unlink Discord
        await userService.unlinkDiscord(userId);
        
        // Update Session
        const updatedUser = await userService.findById(userId);
        req.session.user = {
            ...req.session.user,
            ...updatedUser
        };
        
        res.json({
            success: true,
            message: 'Discord unlinked successfully'
        });
        
    } catch (error) {
        console.error('Discord unlink error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unlink Discord'
        });
    }
});

module.exports = router;
