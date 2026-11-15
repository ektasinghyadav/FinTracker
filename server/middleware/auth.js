const jwt = require('jsonwebtoken');
const User = require('../models/User');

// This middleware runs before any protected route handler.
// It reads the JWT from the cookie, verifies it, and attaches
// the user's ID to req.userId so route handlers can use it.
async function authMiddleware(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    // The account may have been deleted after this token was issued
    // (for example from another device), so check that it still exists.
    let accountExists;
    try {
        accountExists = await User.exists({ _id: decoded.userId });
    } catch (err) {
        return res.status(500).json({ error: 'Could not check your login. Please try again.' });
    }
    if (!accountExists) {
        return res.status(401).json({ error: 'Account not found. Please log in again.' });
    }

    req.userId = decoded.userId;
    next();
}

module.exports = authMiddleware;
