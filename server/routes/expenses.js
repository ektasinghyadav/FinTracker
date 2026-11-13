const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const authMiddleware = require('../middleware/auth');

// All routes in this file are protected — user must be logged in.
// authMiddleware verifies the JWT cookie and sets req.userId.
router.use(authMiddleware);

// ─── SMALL HELPERS ────────────────────────────────────────────────────────────

// True if the text looks like a real date in YYYY-MM-DD form
function isValidDate(text) {
    if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    return !isNaN(new Date(text + 'T12:00:00').getTime());
}

// True if the value is a number greater than 0
function isPositiveNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// ─── EXPENSE ROUTES ───────────────────────────────────────────────────────────

// GET /api/expenses — fetch only THIS user's expenses, newest first
router.get('/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.userId }).sort({ timestamp: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// POST /api/expenses — save a new expense linked to THIS user
router.post('/expenses', async (req, res) => {
    try {
        // Take only the fields we allow. userId always comes from the session.
        const { name, amount, category, date, timestamp } = req.body;

        if (typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Description is required' });
        }
        if (!isPositiveNumber(amount)) {
            return res.status(400).json({ error: 'Amount must be a number greater than 0' });
        }
        if (typeof category !== 'string' || category.trim() === '') {
            return res.status(400).json({ error: 'Category is required' });
        }
        if (!isValidDate(date)) {
            return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
        }

        const expense = new Expense({
            userId: req.userId,
            name: name.trim(),
            amount,
            category: category.trim(),
            date,
            // use the browser's timestamp if it is a number, otherwise the model default
            ...(typeof timestamp === 'number' ? { timestamp } : {})
        });
        await expense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save expense' });
    }
});

// DELETE /api/expenses/:id — delete one of THIS user's expenses
router.delete('/expenses/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'Invalid expense id' });
        }

        const deleted = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!deleted) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// DELETE /api/expenses — clear ALL of THIS user's expenses
router.delete('/expenses', async (req, res) => {
    try {
        await Expense.deleteMany({ userId: req.userId });
        res.json({ message: 'All expenses cleared' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear expenses' });
    }
});

// ─── BUDGET ROUTES ────────────────────────────────────────────────────────────

// GET /api/budget — fetch THIS user's budget
router.get('/budget', async (req, res) => {
    try {
        const budget = await Budget.findOne({ userId: req.userId });
        res.json({ amount: budget ? budget.amount : 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch budget' });
    }
});

// POST /api/budget — set or update THIS user's budget (upsert)
router.post('/budget', async (req, res) => {
    try {
        const { amount } = req.body;

        if (!isPositiveNumber(amount)) {
            return res.status(400).json({ error: 'Budget must be a number greater than 0' });
        }

        let budget = await Budget.findOne({ userId: req.userId });

        if (budget) {
            budget.amount = amount;
            await budget.save();
        } else {
            budget = await Budget.create({ userId: req.userId, amount });
        }

        res.json({ amount: budget.amount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save budget' });
    }
});

module.exports = router;
