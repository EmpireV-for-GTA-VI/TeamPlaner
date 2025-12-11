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
        const user = req.session.user?.name || 'Guest';
        const path = req.path;
        if (!path.includes('/static') && !path.includes('.')) {
            console.log('['+(new Date().toISOString())+'] '+req.method+' '+path+' - User: '+user);
        }
    }
    next();
}

module.exports = { requireAuth, attachUser, sessionLogger };
