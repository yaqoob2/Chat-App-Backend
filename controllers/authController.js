const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');

exports.sendOtp = async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

    try {
        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // In production, integrate SMS gateway here (Twilio, etc.)
        console.log(`Sending OTP ${otp} to ${phoneNumber}`); // For dev purpose

        await Otp.createOrUpdate(phoneNumber, otp);

        res.json({ message: 'OTP sent successfully', devOtp: otp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.verifyOtp = async (req, res) => {
    const { phoneNumber, otp } = req.body;

    // Trim whitespace from OTP
    const cleanOtp = otp?.toString().trim();

    console.log(`Verifying OTP for ${phoneNumber}: Provided OTP "${cleanOtp}"`);

    try {
        const isValid = await Otp.verify(phoneNumber, cleanOtp);
        console.log(`Verification Result for ${phoneNumber}: ${isValid}`);

        if (!isValid) return res.status(400).json({ error: 'Invalid or expired OTP' });

        let user = await User.findByPhone(phoneNumber);
        if (!user) {
            console.log(`Creating new user for ${phoneNumber}`);
            const userId = await User.create(phoneNumber);
            user = await User.findById(userId);
        }

        const token = jwt.sign({ id: user.id, phoneNumber: user.phone_number }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        res.json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    const { username } = req.body;
    console.log(`[UpdateProfile] Request for user ${req.user.id}, username: ${username}`);
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Keep existing profile picture
        await User.updateProfile(req.user.id, username, currentUser.profile_picture);

        const updatedUser = await User.findById(req.user.id);
        console.log('[UpdateProfile] Success:', updatedUser);
        res.json(updatedUser);
    } catch (err) {
        console.error("[UpdateProfile] Error:", err);
        res.status(500).json({ error: 'Internal Server Error: ' + err.message });
    }
};
