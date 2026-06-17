const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ad = require('../models/Ad');
const Withdrawal = require('../models/Withdrawal');
const Notification = require('../models/Notification');
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
        const pendingKYCs = await User.countDocuments({ verificationStatus: 'pending' });
        const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
        const pendingAds = await Ad.countDocuments({ status: 'pending' });

        res.json({
            totalUsers,
            totalAds,
            totalViews,
            revenueEstimate: totalViews * 0.005,
            pendingKYCs,
            pendingWithdrawals,
            pendingAds
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/kycs
router.get('/kycs', [auth, adminAuth], async (req, res) => {
    try {
        const users = await User.find({ verificationStatus: 'pending' });
        res.json(users);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/kyc/:id
router.post('/kyc/:id', [auth, adminAuth], async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const user = await User.findById(req.params.id);
        user.verificationStatus = status; // 'verified' or 'rejected'
        if (rejectionReason) user.kycData.rejectionReason = rejectionReason;
        await user.save();

        const notif = new Notification({
            user: user._id,
            title: status === 'verified' ? '¡Identidad Verificada!' : 'Verificación Rechazada',
            message: status === 'verified' ? 'Ya puedes realizar retiros sin límites.' : `Motivo: ${rejectionReason || 'Documentos inválidos'}`
        });
        await notif.save();
        res.json(user);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/withdrawals
router.get('/withdrawals', [auth, adminAuth], async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ status: 'pending' }).populate('user', 'username email');
        res.json(withdrawals);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/withdrawal/:id
router.post('/withdrawal/:id', [auth, adminAuth], async (req, res) => {
    try {
        const { status } = req.body;
        const withdrawal = await Withdrawal.findById(req.params.id);
        withdrawal.status = status; // 'approved' or 'rejected'
        if (status === 'rejected') {
            // Refund points
            const user = await User.findById(withdrawal.user);
            user.points += withdrawal.pointsDeducted;
            await user.save();
        }
        await withdrawal.save();

        const notif = new Notification({
            user: withdrawal.user,
            title: status === 'approved' ? '¡Retiro Procesado!' : 'Retiro Rechazado',
            message: status === 'approved' ? `Tu pago de $${withdrawal.amount.toFixed(2)} ha sido enviado.` : 'Tus puntos han sido devueltos a tu cuenta.'
        });
        await notif.save();
        res.json(withdrawal);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/ads/pending
router.get('/ads/pending', [auth, adminAuth], async (req, res) => {
    try {
        const ads = await Ad.find({ status: 'pending' }).populate('advertiser', 'username');
        res.json(ads);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST api/admin/ad/:id
router.post('/ad/:id', [auth, adminAuth], async (req, res) => {
    try {
        const { status } = req.body;
        const ad = await Ad.findById(req.params.id);
        ad.status = status; // 'active' or 'rejected'
        await ad.save();

        const notif = new Notification({
            user: ad.advertiser,
            title: status === 'active' ? '¡Anuncio Aprobado!' : 'Anuncio Rechazado',
            message: status === 'active' ? `Tu anuncio "${ad.title}" ya está en circulación.` : `Tu anuncio "${ad.title}" no cumple con las normas.`
        });
        await notif.save();
        res.json(ad);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET api/admin/analytics
router.get('/analytics', [auth, adminAuth], async (req, res) => {
    try {
        // User growth (last 7 days)
        const userGrowth = await User.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Revenue estimate (last 7 days based on views)
        const ViewLog = require('../models/ViewLog');
        const viewRevenue = await ViewLog.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, views: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({ userGrowth, viewRevenue });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
