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

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve the frontend files (index.html, app.js, styles.css)
// __dirname is server/, so we go one level up to reach the root
app.use(express.static(path.join(__dirname, '..')));

// API routes — all our data endpoints start with /api
app.use('/api/auth', authRouter);
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
