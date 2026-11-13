// AI Service — wraps all Hugging Face API calls
// This is the only file in the project that talks to Hugging Face.
// All other parts of the app use these functions.

const HF_API_URL = 'https://router.huggingface.co/hf-inference/models';
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

// These are the same categories used in the frontend dropdown
const CATEGORIES = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Other'
];

// ─── INTERNAL HELPER ─────────────────────────────────────────────────────────

// Makes a POST request to a Hugging Face model
// "model" is the model ID on Hugging Face (e.g. "facebook/bart-large-mnli")
async function hfRequest(model, payload) {
    let res;
    try {
        res = await fetch(`${HF_API_URL}/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            // give up after 15 seconds so the user is never left waiting
            signal: AbortSignal.timeout(15000)
        });
    } catch (err) {
        if (err.name === 'TimeoutError') {
            throw new Error('The AI service took too long to respond. Please enter the expense manually.');
        }
        throw new Error('Could not reach the AI service. Please enter the expense manually.');
    }

    // If the model is loading (cold start), HF returns 503
    if (res.status === 503) {
        const body = await res.json();
        const waitTime = body.estimated_time || 20;
        throw new Error(`Model is loading, try again in ${Math.ceil(waitTime)} seconds`);
    }

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Hugging Face API error (${res.status}): ${error}`);
    }

    return res.json();
}

// ─── EXPORTED FUNCTIONS ───────────────────────────────────────────────────────

// classifyExpense(text)
// Takes any text describing an expense and returns the best matching category.
//
// How it works:
// Hugging Face's "zero-shot classification" model reads the text and scores it
// against each candidate label WITHOUT being trained specifically on expenses.
// It uses general language understanding to figure out the best match.
//
// Example:
//   input:  "Uber ride to the airport"
//   output: { category: "Transportation", confidence: 0.97 }
async function classifyExpense(text) {
    const raw = await hfRequest('facebook/bart-large-mnli', {
        inputs: text,
        parameters: {
            candidate_labels: CATEGORIES
        }
    });

    // The router API returns: [{ label, score }, { label, score }, ...]
    // Already sorted by score descending — first item is the best match.
    if (!Array.isArray(raw) || raw.length === 0 || !raw[0].label) {
        throw new Error(`Unexpected response from Hugging Face: ${JSON.stringify(raw)}`);
    }

    return {
        category: raw[0].label,
        confidence: parseFloat(raw[0].score.toFixed(4))
    };
}

// parseNaturalLanguage(text)
// Takes a full natural language sentence and extracts structured expense data.
//
// Example:
//   input:  "I spent 450 on dinner at a restaurant"
//   output: { amount: 450, category: "Food & Dining", description: "Dinner at a restaurant", date: "2026-03-07" }
async function parseNaturalLanguage(text) {
    // Step 1: Extract amount using regex
    // Matches numbers like: 450, 1500, 1,500, 99.50
    const amountMatch = text.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\b/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

    // Step 2: Resolve date references
    // Default is today; recognise "yesterday" as well
    let date = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const textLower = text.toLowerCase();
    if (textLower.includes('yesterday')) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        date = yesterday.toISOString().split('T')[0];
    }

    // Step 3: Build a clean description
    // Remove the amount, common filler words, and extra whitespace
    const fillerPattern = /\b(i|i've|spent|paid|bought|bought|cost|costs|rs\.?|inr|rupees?|₹|for|on|at|to|the|a|an|today|yesterday|just|my)\b/gi;
    let description = text
        .replace(/\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\b/, '') // remove amount
        .replace(fillerPattern, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Capitalize first letter
    if (description) {
        description = description.charAt(0).toUpperCase() + description.slice(1);
    } else {
        description = text; // fallback to original text if cleaning removed everything
    }

    // Step 4: Use AI to classify the full original text into a category
    // We pass the original text (not the cleaned description) for better accuracy
    const { category, confidence } = await classifyExpense(text);

    return {
        amount,
        category,
        description,
        date,
        confidence
    };
}

module.exports = { classifyExpense, parseNaturalLanguage };
