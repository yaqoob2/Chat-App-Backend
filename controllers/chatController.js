const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.getUserConversations(req.user.id);
        res.json(conversations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.startConversation = async (req, res) => {
    const { phoneNumber } = req.body;

    try {
        const otherUser = await User.findByPhone(phoneNumber);
        if (!otherUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (otherUser.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot chat with yourself' });
        }

        const conversationId = await Conversation.findOrCreateOneOnOne(req.user.id, otherUser.id);
        res.json({ conversationId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMessages = async (req, res) => {
    const { conversationId } = req.params;
    const { cursor, limit } = req.query; // Pagination params

    try {
        const messages = await Message.getByConversationId(
            conversationId,
            parseInt(limit) || 30,
            cursor ? parseInt(cursor) : null
        );
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.sendMessage = async (req, res) => {
    const { conversationId, content, type } = req.body;

    try {
        // For file types (image/video/file/audio), content contains the URL
        // We should store it in both content and fileUrl for backward compatibility
        const messageData = {
            conversationId,
            senderId: req.user.id,
            type
        };

        // If it's a file-based message, store URL in fileUrl field
        if (['image', 'video', 'file', 'audio'].includes(type)) {
            messageData.fileUrl = content;
            messageData.content = null; // Optional: can store filename or null
        } else {
            messageData.content = content;
            messageData.fileUrl = null;
        }

        const message = await Message.create(messageData);

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            // Emit to conversation room (for open chats)
            io.to(`conversation:${conversationId}`).emit('new_message', message);

            // Emit notification to specific participants (for unread counts/list updates)
            try {
                const participants = await Conversation.getParticipants(conversationId);
                console.log(`[Notify] Conversation ${conversationId} participants:`, participants);

                // DEBUG: Emit globally to verify client listener
                io.emit('new_message_notification', message);

                participants.forEach(p => {
                    if (p.user_id !== req.user.id) {
                        console.log(`[Notify] Sending to user:${p.user_id}`);
                        io.to(`user:${p.user_id}`).emit('new_message_notification', message);
                    }
                });
            } catch (err) {
                console.error('Error sending notifications:', err);
            }
        }

        res.json(message);
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete a single message
exports.deleteMessage = async (req, res) => {
    const { messageId } = req.params;

    try {
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Only allow deletion of own messages
        if (message.sender_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await Message.delete(messageId);

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${message.conversation_id}`).emit('message_deleted', { messageId });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete entire conversation (Delete from list)
exports.deleteConversation = async (req, res) => {
    const { conversationId } = req.params;

    try {
        await Conversation.delete(conversationId);

        // Emit socket event to remove from list for real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('conversation_removed', { conversationId });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Clear all messages in conversation
exports.clearConversationMessages = async (req, res) => {
    const { conversationId } = req.params;

    try {
        await Message.deleteByConversation(conversationId);

        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('conversation_cleared');
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};



exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return path accessible via static middleware
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        url: fileUrl,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
    });
};
