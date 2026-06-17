const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const auth = require('../middleware/auth');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: './backend/uploads/kyc/',
    filename: function(req, file, cb) {
        cb(null, 'kyc-' + req.user.id + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }
}).fields([
    { name: 'document', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]);

// @route   GET api/user/me
// @desc    Get current user data
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        // Update Streak & Last Active
        const now = new Date();
        const lastActive = new Date(user.lastActiveAt);
        const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            user.dailyStreak += 1;
            // Award bonus for streaks?
            if (user.dailyStreak % 7 === 0) user.points += 50;
        } else if (diffDays > 1) {
            user.dailyStreak = 1;
        }

        user.lastActiveAt = now;
        await user.save();

        res.json(user);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/leaderboard', auth, async (req, res) => {
    try {
        const topUsers = await User.find({ role: 'user' })
            .sort({ points: -1 })
            .limit(10)
            .select('username displayName points dailyStreak');
        res.json(topUsers);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/kyc', auth, (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ msg: err });
        try {
            if (!req.files || !req.files['document'] || !req.files['selfie']) {
                return res.status(400).json({ msg: 'Please upload both document and selfie images' });
            }

            const user = await User.findById(req.user.id);
            user.kycData = {
                fullName: req.body.fullName,
                idNumber: req.body.idNumber,
                documentImageUrl: req.files['document'][0].path,
                selfieImageUrl: req.files['selfie'][0].path
            };
            user.verificationStatus = 'pending';
            await user.save();
            res.json({ msg: 'KYC submitted successfully', status: 'pending' });
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    });
});

router.get('/referrals/detailed', auth, async (req, res) => {
    try {
        const referrals = await User.find({ referredBy: req.user.id })
            .select('username displayName totalVideosWatched createdAt');
        res.json(referrals);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/update-profile', auth, async (req, res) => {
    try {
        const { displayName, interests } = req.body;
        const user = await User.findById(req.user.id);

        if (displayName) user.displayName = displayName;
        if (interests) user.interests = interests;

        // Explicitly NOT allowing role changes here
        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
