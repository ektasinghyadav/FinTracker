const express = require('express');
const router = express.Router();
const { classifyExpense, parseNaturalLanguage } = require('../services/ai');

// POST /api/ai/classify
// Use this when you already have a description and just need a category.
// Body:    { "text": "electricity bill payment" }
// Returns: { "category": "Bills & Utilities", "confidence": 0.98 }
router.post('/classify', async (req, res) => {
    try {
        const { text } = req.body;

        // text must be a non-empty string (a number or object is invalid input)
        if (typeof text !== 'string' || text.trim() === '') {
            return res.status(400).json({ error: 'text field is required' });
        }

        const result = await classifyExpense(text.trim());
        res.json(result);

    } catch (err) {
        console.error('Classification error:', err.message);
        // 502 = the AI service failed (not our server)
        res.status(502).json({ error: err.message });
    }
});

// POST /api/ai/parse
// Use this for the natural language input feature.
// Body:    { "text": "I spent 450 on dinner at a restaurant" }
// Returns: { "amount": 450, "category": "Food & Dining", "description": "Dinner at restaurant", "date": "2026-03-07", "confidence": 0.95 }
router.post('/parse', async (req, res) => {
    try {
        const { text } = req.body;

        // text must be a non-empty string (a number or object is invalid input)
        if (typeof text !== 'string' || text.trim() === '') {
            return res.status(400).json({ error: 'text field is required' });
        }

        const result = await parseNaturalLanguage(text.trim());
        res.json(result);

    } catch (err) {
        console.error('Parse error:', err.message);
        res.status(502).json({ error: err.message });
    }
});

module.exports = router;
