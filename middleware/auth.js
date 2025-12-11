// Middleware um zu prüfen, ob der Benutzer eingeloggt ist
function requireAuth(req, res, next) {
    if (req.session && req.session.user && req.session.user.authenticated) {
        return next();
    }
    
    // Bei API-Anfragen JSON-Antwort senden
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
            error: 'Unauthorized', 
            message: 'Sie müssen eingeloggt sein, um diese Aktion durchzuführen' 
        });
    }
    
    // Bei normalen Anfragen zum Login weiterleiten
    res.redirect('/auth/login');
}

// Optional: Middleware um Benutzerinformationen zu allen Requests hinzuzufügen
function attachUser(req, res, next) {
    res.locals.user = req.session.user || null;
    res.locals.authenticated = !!(req.session.user && req.session.user.authenticated);
    next();
}

module.exports = {
    requireAuth,
    attachUser
};
