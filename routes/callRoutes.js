const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/initiate', callController.initiateCall);
router.post('/status', callController.updateCallStatus);
router.get('/history', callController.getCallHistory);

module.exports = router;
