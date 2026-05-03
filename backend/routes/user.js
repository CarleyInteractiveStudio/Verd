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
}).single('document');

router.post('/kyc', auth, (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ msg: err });
        try {
            const user = await User.findById(req.user.id);
            user.kycData = {
                fullName: req.body.fullName,
                idNumber: req.body.idNumber,
                documentImageUrl: req.file.path
            };
            user.verificationStatus = 'pending';
            await user.save();
            res.json({ msg: 'KYC submitted successfully' });
        } catch (err) {
            res.status(500).send('Server Error');
        }
    });
});

module.exports = router;
