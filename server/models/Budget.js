const mongoose = require('mongoose');

// We only ever store ONE budget document.
// When the user updates their budget, we update that one document.
const budgetSchema = new mongoose.Schema({
    // unique: one budget document per user
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    amount: { type: Number, required: true }
});

module.exports = mongoose.model('Budget', budgetSchema);
