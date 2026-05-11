const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const countryMap = {
    '+57': 'Colombia', '+52': 'Mexico', '+54': 'Argentina', '+56': 'Chile',
    '+51': 'Peru', '+58': 'Venezuela', '+55': 'Brazil', '+593': 'Ecuador',
    '+502': 'Guatemala', '+503': 'El Salvador', '+504': 'Honduras', '+505': 'Nicaragua',
    '+506': 'Costa Rica', '+507': 'Panama', '+591': 'Bolivia', '+595': 'Paraguay',
    '+598': 'Uruguay', '+501': 'Belize', '+53': 'Cuba', '+1': 'USA/Canada'
};

// @route   POST api/auth/register
// @desc    Register user
router.post('/register', async (req, res) => {
    const { username, email, phone, password, deviceId, referralCode, location } = req.body;

    try {
        // Simple country detection from phone prefix
        let country = 'Unknown';
        for (const prefix in countryMap) {
            if (phone.startsWith(prefix)) {
                country = countryMap[prefix];
                break;
            }
        }

        if (country === 'Unknown') {
            return res.status(400).json({ msg: 'App solo disponible en América y Latinoamérica' });
        }

        let user = await User.findOne({ $or: [{ email }, { phone }] });
        if (user) return res.status(400).json({ msg: 'User already exists with this email or phone' });

        const deviceCount = await User.countDocuments({ deviceId });
        if (deviceCount >= 2) return res.status(400).json({ msg: 'Device limit reached' });

        user = new User({
            username,
            email,
            phone,
            password,
            deviceId,
            country,
            location: location ? { type: 'Point', coordinates: [location.lng, location.lat] } : undefined
        });

        if (referralCode) {
            const referrer = await User.findById(referralCode);
            if (referrer) {
                user.referredBy = referrer._id;
            }
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // In a real app, send OTP here via Twilio
        // console.log(`Sending OTP to ${phone}`);

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

// @route   POST api/auth/verify-phone
router.post('/verify-phone', auth, async (req, res) => {
    const { code } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (code === '123456') { // Placeholder verification code
            user.isPhoneVerified = true;
            await user.save();
            return res.json({ msg: 'Teléfono verificado', verified: true });
        }
        res.status(400).json({ msg: 'Código incorrecto' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
