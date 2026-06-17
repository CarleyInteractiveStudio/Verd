const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true }, // in USD or points? Let's use points.
    currency: { type: String, required: true }, // 'USD', 'Robux', 'FreeFire Diamonds', etc.
    method: { type: String, required: true }, // 'PayPal', 'In-Game'
    details: { type: String, required: true }, // PayPal email or Game ID
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    pointsDeducted: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', WithdrawalSchema);
