require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./db/mongo');
const authRouter = require('./routes/auth');
const expensesRouter = require('./routes/expenses');
const aiRouter = require('./routes/ai');
const streamRouter = require('./routes/stream');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Start connecting to MongoDB right away. If it fails we only log the error here;
// every /api request tries again (see below), so the server never dies.
connectDB().catch(err => console.error('MongoDB connection failed:', err.message));

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve the frontend files (index.html, app.js, styles.css)
// __dirname is server/, so we go one level up to reach the root
app.use(express.static(path.join(__dirname, '..')));

// Before any API route, make sure the database is connected.
// If it is not, reply with a clear error instead of hanging.
app.use('/api', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        res.status(500).json({ error: 'Database is not available. Please try again.' });
    }
});

// API routes — all our data endpoints start with /api
app.use('/api/auth', authRouter);
// Every AI route (classify, parse, stream) needs a logged-in user
app.use('/api/ai', authMiddleware);
app.use('/api', expensesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ai/stream', streamRouter);

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`FinTracker server running at http://localhost:${PORT}`);
    });
}

// For Vercel serverless — export the app instead of calling listen()
module.exports = app;
