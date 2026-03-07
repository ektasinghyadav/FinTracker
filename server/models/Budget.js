const mongoose = require('mongoose');

// We only ever store ONE budget document.
// When the user updates their budget, we update that one document.
const budgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true }
});

module.exports = mongoose.model('Budget', budgetSchema);
