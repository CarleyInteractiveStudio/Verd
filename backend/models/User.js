const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    points: { type: Number, default: 0 },
    deviceId: { type: String, required: true },
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'rejected'],
        default: 'unverified'
    },
    kycData: {
        fullName: String,
        idNumber: String,
        documentImageUrl: String,
        selfieImageUrl: String,
        rejectionReason: String
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    country: String,
    state: String,
    isPhoneVerified: { type: Boolean, default: false },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralCount: { type: Number, default: 0 },
    videosWatchedToday: { type: Number, default: 0 },
    totalVideosWatched: { type: Number, default: 0 },
    lastVideoWatchedAt: { type: Date },
    dailyStreak: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
    advertiserCredits: { type: Number, default: 0 },
    displayName: String,
    fingerprint: { type: String },
    interests: { type: [String], default: [] },
    role: { type: String, enum: ['user', 'advertiser', 'admin'], default: 'user' }
}, { timestamps: true });

UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
