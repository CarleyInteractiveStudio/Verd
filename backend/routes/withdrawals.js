const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/withdrawals
// @desc    Request a withdrawal
router.post('/', auth, async (req, res) => {
    const { method, currency, details, amountPoints } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (user.points < amountPoints) {
            return res.status(400).json({ msg: 'Puntos insuficientes' });
        }

        if (user.verificationStatus !== 'verified') {
            return res.status(400).json({ msg: 'Debes verificar tu cuenta (KYC) antes de retirar' });
        }

        // Minimum withdrawal check (e.g., 5000 points = $5)
        if (amountPoints < 5000) {
            return res.status(400).json({ msg: 'El retiro mínimo es de 5000 puntos ($10.00)' });
        }

        const withdrawal = new Withdrawal({
            user: req.user.id,
            amount: amountPoints / 500, // Example conversion: 500 points = $1
            currency,
            method,
            details,
            pointsDeducted: amountPoints
        });

        user.points -= amountPoints;
        await user.save();
        await withdrawal.save();

        res.json({ msg: 'Solicitud de retiro enviada', points: user.points });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/withdrawals/me
// @desc    Get user's withdrawals
router.get('/me', auth, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(withdrawals);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
