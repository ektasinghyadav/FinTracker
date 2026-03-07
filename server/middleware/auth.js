const jwt = require('jsonwebtoken');

// This middleware runs before any protected route handler.
// It reads the JWT from the cookie, verifies it, and attaches
// the user's ID to req.userId so route handlers can use it.
function authMiddleware(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
}

module.exports = authMiddleware;
