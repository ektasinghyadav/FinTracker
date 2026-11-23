require('dotenv').config();

const express = require('express');
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
// No CORS: the pages and the API are served from the same address, so the browser
// never needs to allow another website to call the API with the user's cookie.
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Serve only the front-end files (pages, app.js, js/, styles.css), never the
// server code, scripts, docs or package files that sit in the same folder.
const PUBLIC_FILES = /^\/(?:[\w-]+\.html|app\.js|styles\.css|js\/[\w-]+\.js)?$/;
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (!PUBLIC_FILES.test(req.path)) return res.status(404).send('Not found');
    next();
});
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
// The AI routes (classify and the streamed summary) need a logged-in user
app.use('/api/ai', authMiddleware, aiRouter);
app.use('/api/stream', authMiddleware, streamRouter);
// Expenses and budget (this router checks the login itself)
app.use('/api', expensesRouter);

// Unknown /api addresses and unexpected errors answer in JSON, like every other API reply
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.use((err, req, res, next) => {
    // body-parser errors carry a status: 400 = bad JSON, 413 = body too large
    const status = err.status || 500;
    if (status === 413) return res.status(413).json({ error: 'The request is too large' });
    if (status < 500) return res.status(status).json({ error: 'The request could not be read' });
    console.error('Unexpected error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`FinTracker server running at http://localhost:${PORT}`);
    });
}

// For Vercel serverless — export the app instead of calling listen()
module.exports = app;
