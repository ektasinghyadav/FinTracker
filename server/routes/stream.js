const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const { streamSummary, cleanToday } = require('../services/ai');

// This route is protected: index.js puts authMiddleware in front of it.

// Add up amounts by category: { 'Food & Dining': 1200, ... }
function totalsByCategory(expenses) {
    const totals = {};
    for (const expense of expenses) {
        totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    }
    return totals;
}

function sumAmounts(expenses) {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

// The month before "YYYY-MM"
function previousMonth(month) {
    const [year, mm] = month.split('-').map(Number);
    const date = new Date(year, mm - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Read one calendar month of THIS user's expenses (dates are "YYYY-MM-DD" text)
function expensesOfMonth(userId, month) {
    return Expense.find({ userId, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).lean();
}

// GET /api/stream/summary
// Streams a written summary of the user's current month, as plain text.
// The server reads the data itself from the database; the browser sends nothing about the spending.
// Optional query: ?today=2026-11-16 (the browser's date, so the month matches the user's time zone)
router.get('/summary', async (req, res) => {
    try {
        const today = cleanToday(req.query.today);
        const month = today.slice(0, 7);

        // Read this month, last month and the budget at the same time (parallel requests)
        const [expenses, lastMonthExpenses, budget] = await Promise.all([
            expensesOfMonth(req.userId, month),
            expensesOfMonth(req.userId, previousMonth(month)),
            Budget.findOne({ userId: req.userId })
        ]);
        if (expenses.length === 0) {
            return res.status(400).json({ error: 'Add some expenses this month first, so the AI has something to summarise.' });
        }

        // Work out the numbers the AI will talk about
        const total = sumAmounts(expenses);
        const [year, mm, dd] = today.split('-').map(Number);
        const daysInMonth = new Date(year, mm, 0).getDate();
        const dailyAverage = total / dd;

        const thisMonthTotals = totalsByCategory(expenses);
        const lastMonthTotals = totalsByCategory(lastMonthExpenses);
        const categories = Object.keys(thisMonthTotals)
            .map(name => ({ name, total: thisMonthTotals[name], lastMonth: lastMonthTotals[name] || 0 }))
            .sort((a, b) => b.total - a.total);
        const biggest = [...expenses]
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
            .map(e => ({ name: e.name, category: e.category, amount: e.amount, date: e.date }));

        const context = {
            month: new Date(year, mm - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            budget: budget ? budget.amount : 0,
            total,
            expenseCount: expenses.length,
            dayOfMonth: dd,
            daysInMonth,
            dailyAverage,
            projected: dailyAverage * daysInMonth,
            lastMonthTotal: sumAmounts(lastMonthExpenses),
            categories,
            biggest
        };

        // Read the first piece BEFORE sending headers, so an AI failure can still
        // be answered with a normal error code and message.
        const stream = streamSummary(context);
        const first = await stream.next();

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');

        if (!first.done) res.write(first.value);
        try {
            for await (const chunk of stream) {
                res.write(chunk);
            }
        } catch (err) {
            // The AI failed half way. We cannot change the status any more, so close the
            // connection; the browser sees the broken stream and offers a retry.
            console.error('Summary stream broke:', err.message);
            return res.destroy();
        }
        res.end();

    } catch (err) {
        console.error('Summary error:', err.message);
        if (!res.headersSent) {
            // 502 = the AI service failed (or is not set up); the message says what to do
            res.status(502).json({ error: err.message });
        } else {
            res.destroy();
        }
    }
});

module.exports = router;
