const mongoose = require('mongoose');

const ViewLogSchema = new mongoose.Schema({
    ad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    country: String,
    state: String,
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] }
    }
}, { timestamps: true });

module.exports = mongoose.model('ViewLog', ViewLogSchema);
