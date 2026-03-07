const express = require('express');
const router = express.Router();

// Swap this flag to true once a working Gemini API key is available
const USE_GEMINI = false;

const { GoogleGenerativeAI } = require('@google/generative-ai');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// POST /api/ai/stream/summary
router.post('/summary', async (req, res) => {
    try {
        const { total, budget, topCategory, dailyAvg, daysRemaining } = req.body;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');

        if (USE_GEMINI && process.env.GEMINI_API_KEY) {
            // ── Real Gemini streaming ─────────────────────────────────────────
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

            const prompt = `You are FinTracker AI, a friendly personal finance assistant.
Analyze this user's spending data and write a 2-3 sentence summary followed by one specific actionable tip.

Spending data:
- Total spent this month: ₹${total}
- Monthly budget: ₹${budget || 'not set'}
- Highest spending category: ${topCategory || 'none'}
- Daily average: ₹${dailyAvg}
- Days remaining in month: ${daysRemaining}

Be concise, warm, and specific. Use ₹ for amounts. Write in plain paragraphs, no bullet points.`;

            const result = await model.generateContentStream(prompt);
            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) res.write(text);
            }

        } else {
            // ── Computed streaming (fallback) ─────────────────────────────────
            const totalNum  = parseFloat(total)    || 0;
            const budgetNum = parseFloat(budget)   || 0;
            const dailyNum  = parseFloat(dailyAvg) || 0;
            const daysLeft  = parseInt(daysRemaining) || 0;
            const projected = Math.round(dailyNum * (new Date().getDate() + daysLeft));

            const sentences = [];

            if (budgetNum > 0) {
                const pct = Math.round((totalNum / budgetNum) * 100);
                sentences.push(pct > 100
                    ? `You have exceeded your monthly budget of ₹${budgetNum.toLocaleString()} — you have spent ₹${totalNum.toLocaleString()}, which is ${pct - 100}% over your limit.`
                    : `You have spent ₹${totalNum.toLocaleString()} so far this month, which is ${pct}% of your ₹${budgetNum.toLocaleString()} budget — ${100 - pct}% remaining.`
                );
            } else {
                sentences.push(`You have spent ₹${totalNum.toLocaleString()} this month across all categories.`);
            }

            if (topCategory && topCategory !== 'None') {
                sentences.push(`Your highest spending category is ${topCategory}, which is where most of your money is going.`);
            }

            if (budgetNum > 0 && projected > budgetNum) {
                const safeLimit = daysLeft > 0 ? Math.round((budgetNum - totalNum) / daysLeft) : 0;
                sentences.push(`At ₹${Math.round(dailyNum)}/day, you are projected to overspend by ₹${Math.round(projected - budgetNum).toLocaleString()}. Try to keep spending under ₹${safeLimit.toLocaleString()}/day for the remaining ${daysLeft} days.`);
            } else if (daysLeft > 0) {
                const safeLimit = budgetNum > 0 ? Math.round((budgetNum - totalNum) / daysLeft) : Math.round(dailyNum);
                sentences.push(`With ${daysLeft} days left and a daily average of ₹${Math.round(dailyNum)}, you are on track. You can comfortably spend up to ₹${safeLimit.toLocaleString()}/day and stay within budget.`);
            }

            const words = sentences.join(' ').split(' ');
            for (const word of words) {
                res.write(word + ' ');
                await sleep(55);
            }
        }

        res.end();

    } catch (err) {
        console.error('Stream error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        } else {
            res.end();
        }
    }
});

module.exports = router;
