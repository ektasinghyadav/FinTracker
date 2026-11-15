const express = require('express');
const router = express.Router();
const { classifyExpense, cleanToday } = require('../services/ai');

// These routes are protected: index.js puts authMiddleware in front of them.

// POST /api/ai/classify
// Turns one sentence into the fields of an expense (used by the Add Expense page).
// Body:    { "text": "spent 450 on dinner yesterday", "today": "2026-11-16" }   (today is optional)
// Returns: { "amount": 450, "description": "Dinner", "category": "Food & Dining",
//            "date": "2026-11-15", "source": "ai" }
// source is "ai", or "rules" when the AI was not available and simple keyword rules were used.
router.post('/classify', async (req, res) => {
    try {
        const { text, today } = req.body;

        if (typeof text !== 'string' || text.trim() === '') {
            return res.status(400).json({ error: 'text field is required' });
        }
        if (text.length > 300) {
            return res.status(400).json({ error: 'Please keep the sentence under 300 characters' });
        }

        const result = await classifyExpense(text.trim(), cleanToday(today));
        res.json(result);

    } catch (err) {
        console.error('Classification error:', err.message);
        // 502 = something outside our own code failed
        res.status(502).json({ error: 'Could not read that sentence. Please fill the form by hand.' });
    }
});

module.exports = router;
