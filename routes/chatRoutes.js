const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Test endpoint (no auth required)
router.get('/test', (req, res) => {
    res.json({ message: 'Chat routes are working!', timestamp: new Date() });
});

router.use(authMiddleware);

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: Get all conversations
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: List of conversations
 *   post:
 *     summary: Start a new conversation
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: The created or existing conversation
 *       404:
 *         description: User not found
 */

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.startConversation);
router.post('/upload', upload.single('file'), chatController.uploadFile);
router.get('/messages/:conversationId', chatController.getMessages);
router.post('/messages', chatController.sendMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);
// Delete entire conversation (Delete from list)
router.delete('/conversations/:conversationId', chatController.deleteConversation);

// Clear all messages in conversation
router.delete('/conversations/:conversationId/messages', chatController.clearConversationMessages);

module.exports = router;
