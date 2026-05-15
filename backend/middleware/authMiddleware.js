const jwt = require('jsonwebtoken');

/**
 * authMiddleware
 * Verifies the Bearer JWT on every protected route.
 * Attaches the decoded payload to req.user so controllers can read it.
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;   // { id, role, username, iat, exp }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
}

/**
 * requireRole(...roles)
 * Use AFTER authMiddleware to lock a route to specific roles.
 * Usage: app.delete('/api/users/:id', authMiddleware, requireRole('admin'), ...)
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }
        const userRole = (req.user.role || '').toLowerCase().replace(/\s+/g, '');
        const allowed  = roles.map(r => r.toLowerCase().replace(/\s+/g, ''));
        if (!allowed.includes(userRole)) {
            return res.status(403).json({ success: false, message: 'Forbidden. Insufficient permissions.' });
        }
        next();
    };
}

module.exports = { authMiddleware, requireRole };
