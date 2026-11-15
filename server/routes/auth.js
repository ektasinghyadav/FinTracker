const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const authMiddleware = require('../middleware/auth');

// Cookie settings — httpOnly means JS cannot read the token (prevents XSS attacks)
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' needed for cross-site on Vercel
    maxAge:   7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, password } = req.body;
        // Emails are stored in lowercase, so look them up in lowercase too
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

        if (typeof name !== 'string' || !name.trim() || !email || typeof password !== 'string' || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        // Hash the password — never store plain text passwords
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({ name, email, password: hashedPassword });

        // Create a JWT token and store it in a cookie
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, COOKIE_OPTIONS);

        res.status(201).json({ name: user.name, email: user.email });

    } catch (err) {
        // 11000 = two sign-ups with the same email arrived at the same moment
        if (err.code === 11000) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { password } = req.body;
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

        if (!email || typeof password !== 'string' || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, COOKIE_OPTIONS);

        res.json({ name: user.name, email: user.email });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me — returns the logged-in user (used on page load to check session)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(401).json({ error: 'User not found' });
        res.json({ name: user.name, email: user.email });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// PUT /api/auth/profile — change the logged-in user's name and email
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        // The email must not belong to a different account
        const taken = await User.findOne({ email, _id: { $ne: req.userId } });
        if (taken) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { name: name.trim(), email },
            { new: true, runValidators: true }
        );
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({ name: user.name, email: user.email });

    } catch (err) {
        // 11000 = someone took this email at the same moment
        if (err.code === 11000) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }
        console.error('Profile update error:', err.message);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/auth/password — change the password (needs the current password)
router.put('/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (typeof currentPassword !== 'string' || !currentPassword ||
            typeof newPassword !== 'string' || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // The current password must match the stored hash (FR-7.4)
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        res.json({ message: 'Password changed' });

    } catch (err) {
        console.error('Password change error:', err.message);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// DELETE /api/auth/account — delete the account and all its data (needs the password)
router.delete('/account', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;

        if (typeof password !== 'string' || !password) {
            return res.status(400).json({ error: 'Password is required to delete your account' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Password is incorrect' });
        }

        // Remove the data first and the user last, so a failed attempt can simply be repeated
        await Expense.deleteMany({ userId: req.userId });
        await Budget.deleteMany({ userId: req.userId });
        await User.deleteOne({ _id: req.userId });

        res.clearCookie('token');
        res.json({ message: 'Account deleted' });

    } catch (err) {
        console.error('Account delete error:', err.message);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

module.exports = router;
