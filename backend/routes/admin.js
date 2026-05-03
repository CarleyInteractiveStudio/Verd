const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');

const adminAuth = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') return res.status(401).json({ msg: 'Admin access denied' });
        next();
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

router.get('/stats', [auth, adminAuth], async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalAds = await Ad.countDocuments();
        const ads = await Ad.find();
        const totalViews = ads.reduce((acc, ad) => acc + ad.viewsCompleted, 0);
        res.json({ totalUsers, totalAds, totalViews, revenueEstimate: totalViews * 0.005 });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
