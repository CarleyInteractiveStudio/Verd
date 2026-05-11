const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register user
router.post('/register', async (req, res) => {
    const { username, email, phone, password, deviceId, referralCode } = req.body;

    try {
        let user = await User.findOne({ $or: [{ email }, { phone }] });
        if (user) return res.status(400).json({ msg: 'User already exists with this email or phone' });

        const deviceCount = await User.countDocuments({ deviceId });
        if (deviceCount >= 2) return res.status(400).json({ msg: 'Device limit reached' });

        user = new User({ username, email, phone, password, deviceId });

        if (referralCode) {
            const referrer = await User.findById(referralCode);
            if (referrer) {
                user.referredBy = referrer._id;
            }
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = { id: user.id };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        const payload = { id: user.id };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
