const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

module.exports = (io) => {
    // Store user socket mappings
    const userSockets = new Map(); // userId -> socketId

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error"));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error("Authentication error"));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.phoneNumber} (${socket.id})`);

        userSockets.set(socket.user.id, socket.id);

        // Broadcast user came online - last_seen is null because they are online now
        io.emit('user_status', { userId: socket.user.id, status: 'online', last_seen: null });

        // Join a room for personal notifications (calls etc)
        socket.join(`user:${socket.user.id}`);

        // Send online users list to new connection
        socket.emit('online_users', Array.from(userSockets.keys()));

        // --- CONVERSATION EVENTS ---

        socket.on('conv:join', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
            console.log(`User ${socket.user.id} joined conversation ${conversationId}`);
        });

        socket.on('conv:leave', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });

        socket.on('join_conversation', (conversationId) => { // Keep legacy support for now
            socket.join(`conversation:${conversationId}`);
        });

        // --- MESSAGING EVENTS ---

        // Send Message
        socket.on('msg:send', async ({ conversationId, tempId, content, type = 'text', fileUrl }) => {
            try {
                // Save to DB
                const message = await Message.create({
                    conversationId,
                    senderId: socket.user.id,
                    content,
                    type,
                    fileUrl
                });

                // 1. Ack to sender (so they can replace tempId with real Id and show single tick)
                socket.emit('msg:sent', {
                    tempId,
                    messageId: message.id,
                    message: message, // Send full message back
                    status: 'sent'
                });

                // 2. Emit to others in room (Receiver)
                socket.to(`conversation:${conversationId}`).emit('new_message', message);

                // 3. Emit notification to specific participants (for unread counts/list updates)
                const participants = await Conversation.getParticipants(conversationId);
                participants.forEach(p => {
                    if (p.user_id !== socket.user.id) {
                        io.to(`user:${p.user_id}`).emit('new_message_notification', message);
                    }
                });

            } catch (err) {
                console.error('Error sending message:', err);
                socket.emit('msg:error', { tempId, error: 'Failed to send' });
            }
        });

        // Delivery Receipt (Receiver client sends this when they get msg:new)
        socket.on('msg:delivered', async ({ messageId, conversationId, senderId }) => {
            try {
                await Message.updateStatus(messageId, 'delivered');

                // Notify the sender that message was delivered
                // We broadcast this status update to the conversation room so sender sees it across devices
                io.to(`conversation:${conversationId}`).emit('msg:status_update', {
                    messageId,
                    status: 'delivered',
                    conversationId
                });
            } catch (err) {
                console.error('Error marking delivered:', err);
            }
        });

        // Read Receipt (Receiver client sends this when they view chat)
        socket.on('msg:seen', async ({ conversationId, lastSeenMessageId }) => {
            try {
                // Mark all messages as read for this user in this conversation.
                // Since this user IS the reader, we mark messages where sender != this user.
                await Message.markAsRead(conversationId, socket.user.id);

                // Notify everyone in conversation (so sender sees blue ticks)
                io.to(`conversation:${conversationId}`).emit('msg:seen_update', {
                    conversationId,
                    readerId: socket.user.id,
                    lastSeenMessageId
                });
            } catch (err) {
                console.error('Error marking seen:', err);
            }
        });

        // --- TYPING INDICATORS ---

        socket.on('typing:start', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:start', {
                userId: socket.user.id,
                conversationId
            });
        });

        socket.on('typing:stop', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:stop', {
                userId: socket.user.id,
                conversationId
            });
        });

        // --- WEBRTC SIGNALING (Existing) ---
        socket.on('call_user', ({ userToCallId, signalData, fromUser, callType }) => {
            const socketId = userSockets.get(userToCallId);
            if (socketId) {
                io.to(socketId).emit('call_incoming', {
                    signal: signalData,
                    from: fromUser,
                    callType: callType || 'video'
                });
            }
        });

        socket.on('answer_call', (data) => {
            const socketId = userSockets.get(data.to);
            if (socketId) {
                io.to(socketId).emit('call_answered', { signal: data.signal });
            }
        });

        socket.on('ice_candidate', ({ target, candidate }) => {
            const socketId = userSockets.get(target);
            if (socketId) {
                io.to(socketId).emit('ice_candidate', { candidate });
            }
        });

        socket.on('end_call', ({ to }) => {
            const socketId = userSockets.get(to);
            if (socketId) {
                io.to(socketId).emit('call_ended');
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            userSockets.delete(socket.user.id);

            // Broadcast user went offline with last seen time
            io.emit('user_status', {
                userId: socket.user.id,
                status: 'offline',
                last_seen: new Date().toISOString()
            });
        });
    });
};
