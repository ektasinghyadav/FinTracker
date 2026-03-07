const mongoose = require('mongoose');

// On a traditional server this runs once at startup.
// On Vercel (serverless), each function invocation may be a fresh process,
// so we cache the connection state to avoid opening a new connection every time.
let isConnected = false;

async function connectDB() {
    if (isConnected) return;

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true;
        console.log('Connected to MongoDB successfully');
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1);
    }
}

module.exports = connectDB;
