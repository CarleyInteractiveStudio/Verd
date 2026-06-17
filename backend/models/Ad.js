const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema({
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalViewsOrdered: { type: Number, required: true },
    viewsCompleted: { type: Number, default: 0 },
    cpm: { type: Number, required: true }, // Cost per 1000 views
    status: { type: String, enum: ['pending', 'active', 'paused', 'completed'], default: 'pending' },
    category: { type: String, default: 'general' },
    scope: { type: String, enum: ['global', 'national', 'local'], default: 'global' },
    targetCountry: String,
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] } // [longitude, latitude]
    },
    ctaText: { type: String, default: 'Visitar Web' },
    ctaUrl: String
}, { timestamps: true });

AdSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Ad', AdSchema);
