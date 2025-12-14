function requireAuth(req, res, next) {
    if (req.session && req.session.user && req.session.user.authenticated) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required', authenticated: false });
}

function attachUser(req, res, next) {
    res.locals.user = req.session.user || null;
    res.locals.authenticated = !!(req.session.user && req.session.user.authenticated);
    next();
}

function sessionLogger(req, res, next) {
    if (process.env.NODE_ENV === 'development') {
        const user = req.session.user?.displayName || req.session.user?.name || 'Guest';
        const path = req.path;
        if (!path.includes('/static') && !path.includes('.')) {
            console.log('['+(new Date().toISOString())+'] '+req.method+' '+path+' - User: '+user);
        }
    }
    next();
}

function requireBridgeAuth(req, res, next) {
    const token = req.headers['x-bridge-token'];
    const expectedToken = process.env.BRIDGE_TOKEN || 'your_super_secret_bridge_token_12345';
    
    if (token === expectedToken) {
        return next();
    }
    
    res.status(403).json({ 
        success: false, 
        error: 'Invalid bridge token' 
    });
}

function requireTeamOrg(req, res, next) {
    if (!req.session || !req.session.user || !req.session.user.authenticated) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required', authenticated: false });
    }
    
    // Prüfe ob User zur Organisation "Team" (ID=2) gehört
    if (req.session.user.organisation?.id === 2) {
        return next();
    }
    
    res.status(403).json({ 
        success: false, 
        error: 'Access denied. Only Team members allowed.' 
    });
}

function requireProjectLeader(req, res, next) {
    if (!req.session || !req.session.user || !req.session.user.authenticated) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required', authenticated: false });
    }
    
    // Prüfe ob User die Rolle "Projektleitung" hat
    if (req.session.user.role?.name === 'Projektleitung') {
        return next();
    }
    
    res.status(403).json({ 
        success: false, 
        error: 'Access denied. Only project leaders can manage permissions.' 
    });
}

module.exports = { requireAuth, attachUser, sessionLogger, requireBridgeAuth, requireTeamOrg, requireProjectLeader };
