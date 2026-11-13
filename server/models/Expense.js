const mongoose = require('mongoose');

// A "schema" defines the shape of data stored in MongoDB.
// Think of it like a template for every expense document.
const expenseSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:      { type: String, required: true },
    amount:    { type: Number, required: true, min: 0.01 }, // must be greater than 0
    category:  { type: String, required: true },
    date:      { type: String, required: true }, // stored as "YYYY-MM-DD" string
    timestamp: { type: Number, default: () => Date.now() }
}, {
    // Mongoose automatically adds createdAt and updatedAt fields
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
