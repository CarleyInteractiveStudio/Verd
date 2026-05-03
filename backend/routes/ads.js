const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const User = require('../models/User');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// @route   GET api/ads/free
// @desc    Get ads for the "Free Videos" window
router.get('/free', auth, async (req, res) => {
    try {
        const ads = await Ad.find({
            status: 'active',
            $expr: { $lt: ["$viewsCompleted", "$totalViewsOrdered"] }
        }).limit(20);
        res.json(ads);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/ads/random
// @desc    Get a random ad
router.get('/random', auth, async (req, res) => {
    try {
        const count = await Ad.countDocuments({ status: 'active', $expr: { $lt: ["$viewsCompleted", "$totalViewsOrdered"] } });
        const random = Math.floor(Math.random() * count);
        const ad = await Ad.findOne({ status: 'active', $expr: { $lt: ["$viewsCompleted", "$totalViewsOrdered"] } }).skip(random);
        res.json(ad);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/ads/complete/:id
// @desc    Mark ad as watched and award points
router.post('/complete/:id', auth, async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        const user = await User.findById(req.user.id);

        if (!ad) return res.status(404).json({ msg: 'Ad not found' });

        // Anti-fraud: Check time since last watch (minimum 15s)
        const now = new Date();
        if (user.lastVideoWatchedAt) {
            const timeDiff = (now - user.lastVideoWatchedAt) / 1000;
            if (timeDiff < 15) {
                return res.status(400).json({ msg: 'Watching too fast' });
            }
        }

        // Daily limit check (e.g., 50 videos)
        if (user.videosWatchedToday >= 50) {
            return res.status(400).json({ msg: 'Daily limit reached' });
        }

        // Update Ad views
        ad.viewsCompleted += 1;
        if (ad.viewsCompleted >= ad.totalViewsOrdered) {
            ad.status = 'completed';
        }
        await ad.save();

        // Award points
        user.points += 2;
        user.videosWatchedToday += 1;
        user.totalVideosWatched = (user.totalVideosWatched || 0) + 1;
        user.lastVideoWatchedAt = now;
        await user.save();

        // Referral logic
        if (user.referredBy && user.totalVideosWatched === 20) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
                referrer.points += 100;
                await referrer.save();
            }
        }

        res.json({ points: user.points, msg: 'Points awarded successfully' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
