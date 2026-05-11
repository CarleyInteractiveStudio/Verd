const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './backend/uploads/videos/',
    filename: function(req, file, cb) {
        cb(null, 'ad-' + req.user.id + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20000000 } // 20MB
}).single('video');

// @route   POST api/advertiser/ads
router.post('/ads', auth, (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ msg: err });
        try {
            const { title, totalViews, cpm, scope, targetCountry, lat, lng } = req.body;
            const newAd = new Ad({
                title,
                videoUrl: req.file.path,
                advertiser: req.user.id,
                totalViewsOrdered: totalViews,
                cpm,
                scope,
                targetCountry,
                location: (lat && lng) ? { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] } : undefined,
                status: 'pending'
            });
            await newAd.save();
            res.json(newAd);
        } catch (err) {
            res.status(500).send('Server Error');
        }
    });
});

const ViewLog = require('../models/ViewLog');

router.get('/ads/:id/stats', auth, async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (ad.advertiser.toString() !== req.user.id) return res.status(401).json({ msg: 'Unauthorized' });

        const logs = await ViewLog.find({ ad: req.params.id });

        // Group by country and state for summary
        const stats = {};
        logs.forEach(log => {
            const key = `${log.country || 'Unknown'} - ${log.state || 'General'}`;
            stats[key] = (stats[key] || 0) + 1;
        });

        res.json({ logs, stats });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/my-ads', auth, async (req, res) => {
    try {
        const ads = await Ad.find({ advertiser: req.user.id });
        res.json(ads);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
