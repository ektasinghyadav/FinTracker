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

// Checks the four expense fields sent by the browser.
// Returns { error } if something is wrong, otherwise { fields } with clean values.
// Used by both "add expense" and "edit expense" so the rules live in one place.
function readExpenseFields(body) {
    const { name, amount, category, date } = body;

    if (typeof name !== 'string' || name.trim() === '') {
        return { error: 'Description is required' };
    }
    if (!isPositiveNumber(amount)) {
        return { error: 'Amount must be a number greater than 0' };
    }
    if (typeof category !== 'string' || category.trim() === '') {
        return { error: 'Category is required' };
    }
    if (!isValidDate(date)) {
        return { error: 'Date must be in YYYY-MM-DD format' };
    }

    return { fields: { name: name.trim(), amount, category: category.trim(), date } };
}

// ─── EXPENSE ROUTES ───────────────────────────────────────────────────────────

// GET /api/expenses — fetch only THIS user's expenses, newest first
// Optional filters (dates are "YYYY-MM-DD" text, so comparing them as text works):
//   ?month=2026-11                  one calendar month
//   ?from=2026-11-01&to=2026-11-15  a custom date range (either one can be left out)
router.get('/expenses', async (req, res) => {
    try {
        const { month, from, to } = req.query;
        const query = { userId: req.userId };

        if (month !== undefined) {
            if (from !== undefined || to !== undefined) {
                return res.status(400).json({ error: 'Use either month or from/to, not both' });
            }
            if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
                return res.status(400).json({ error: 'Month must be in YYYY-MM format' });
            }
            query.date = { $gte: `${month}-01`, $lte: `${month}-31` };
        } else if (from !== undefined || to !== undefined) {
            if (from !== undefined && !isValidDate(from)) {
                return res.status(400).json({ error: 'From date must be in YYYY-MM-DD format' });
            }
            if (to !== undefined && !isValidDate(to)) {
                return res.status(400).json({ error: 'To date must be in YYYY-MM-DD format' });
            }
            if (from !== undefined && to !== undefined && from > to) {
                return res.status(400).json({ error: 'From date must not be after the To date' });
            }
            query.date = {};
            if (from !== undefined) query.date.$gte = from;
            if (to !== undefined) query.date.$lte = to;
        }

        const expenses = await Expense.find(query).sort({ timestamp: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// POST /api/expenses — save a new expense linked to THIS user
router.post('/expenses', async (req, res) => {
    try {
        // Only the allowed fields are saved. userId always comes from the session.
        const { error, fields } = readExpenseFields(req.body);
        if (error) {
            return res.status(400).json({ error });
        }

        const { timestamp } = req.body;
        const expense = new Expense({
            userId: req.userId,
            ...fields,
            // use the browser's timestamp if it is a number, otherwise the model default
            ...(typeof timestamp === 'number' ? { timestamp } : {})
        });
        await expense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save expense' });
    }
});

// PUT /api/expenses/:id — edit one of THIS user's expenses
router.put('/expenses/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'Invalid expense id' });
        }

        const { error, fields } = readExpenseFields(req.body);
        if (error) {
            return res.status(400).json({ error });
        }

        // The filter includes userId, so nobody can edit another user's expense
        const updated = await Expense.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            fields,
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update expense' });
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
