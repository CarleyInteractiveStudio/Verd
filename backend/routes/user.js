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
        res.json(user);
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

module.exports = router;
