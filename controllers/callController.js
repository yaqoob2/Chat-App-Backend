const Call = require('../models/Call');
const User = require('../models/User');

exports.initiateCall = async (req, res) => {
    const { receiverId } = req.body;
    try {
        const callId = await Call.create({
            callerId: req.user.id,
            receiverId
        });
        res.json({ callId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateCallStatus = async (req, res) => {
    const { callId, status } = req.body; // status: ongoing, ended, missed
    try {
        await Call.updateStatus(callId, status);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getCallHistory = async (req, res) => {
    try {
        const history = await Call.getHistory(req.user.id);
        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
