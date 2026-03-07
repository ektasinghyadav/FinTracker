const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const authMiddleware = require('../middleware/auth');

// All routes in this file are protected — user must be logged in.
// authMiddleware verifies the JWT cookie and sets req.userId.
router.use(authMiddleware);

// ─── EXPENSE ROUTES ───────────────────────────────────────────────────────────

// GET /api/expenses — fetch only THIS user's expenses
router.get('/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.userId }).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// POST /api/expenses — save a new expense linked to THIS user
router.post('/expenses', async (req, res) => {
    try {
        const expense = new Expense({ ...req.body, userId: req.userId });
        await expense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save expense' });
    }
});

// DELETE /api/expenses/:id — delete one of THIS user's expenses
router.delete('/expenses/:id', async (req, res) => {
    try {
        await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
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

// POST /api/budget — set or update THIS user's budget
router.post('/budget', async (req, res) => {
    try {
        const { amount } = req.body;
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
