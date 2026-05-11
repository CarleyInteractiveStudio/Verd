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
            const newAd = new Ad({
                title: req.body.title,
                videoUrl: req.file.path,
                advertiser: req.user.id,
                totalViewsOrdered: req.body.totalViews,
                cpm: req.body.cpm,
                status: 'pending'
            });
            await newAd.save();
            res.json(newAd);
        } catch (err) {
            res.status(500).send('Server Error');
        }
    });
});

module.exports = router;
