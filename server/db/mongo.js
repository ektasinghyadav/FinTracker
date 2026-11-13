const mongoose = require('mongoose');

// On a traditional server this runs once at startup.
// On Vercel (serverless), each function invocation may be a fresh process,
// so we remember the connection to avoid opening a new one every time.
let isConnected = false;
let connecting = null; // the connection attempt that is currently running

// If the connection fails we throw the error (we do NOT stop the process).
// The next call simply tries again.
async function connectDB() {
    if (isConnected) return;

    if (!connecting) {
        connecting = mongoose.connect(process.env.MONGODB_URI)
            .then(() => {
                isConnected = true;
                console.log('Connected to MongoDB successfully');
            })
            .finally(() => {
                connecting = null;
            });
    }

    await connecting;
}

module.exports = connectDB;
