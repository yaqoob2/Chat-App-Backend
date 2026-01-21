const pool = require('../config/db');

class Conversation {
    static async findOrCreateOneOnOne(user1Id, user2Id) {
        // Check if conversation exists
        const [rows] = await pool.query(`
      SELECT c.id 
      FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
      WHERE c.type = 'individual'
      AND cp1.user_id = ? 
      AND cp2.user_id = ?
    `, [user1Id, user2Id]);

        if (rows.length > 0) {
            return rows[0].id;
        }

        // Create new conversation
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [res] = await conn.query('INSERT INTO conversations (type) VALUES (?)', ['individual']);
            const conversationId = res.insertId;

            await conn.query(
                'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)',
                [conversationId, user1Id, conversationId, user2Id]
            );

            await conn.commit();
            return conversationId;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    static async getUserConversations(userId) {
        const query = `
      SELECT c.id, c.type, c.created_at,
             m.content as last_message, m.created_at as last_message_time, m.type as last_message_type,
             u.id as other_user_id, u.username as other_username, u.phone_number as other_phone, u.profile_picture as other_avatar,
             (SELECT COUNT(*) FROM messages msg WHERE msg.conversation_id = c.id AND msg.is_read = FALSE AND msg.sender_id != ?) as unread_count
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != ?
      JOIN users u ON cp2.user_id = u.id
      LEFT JOIN messages m ON c.id = m.conversation_id AND m.id = (
        SELECT MAX(id) FROM messages WHERE conversation_id = c.id
      )
      WHERE cp.user_id = ?
      ORDER BY last_message_time DESC
    `;
        const [rows] = await pool.query(query, [userId, userId, userId]);
        return rows;
    }
    static async delete(conversationId) {
        await pool.query('DELETE FROM conversations WHERE id = ?', [conversationId]);
    }

    static async getParticipants(conversationId) {
        const [rows] = await pool.query('SELECT user_id FROM conversation_participants WHERE conversation_id = ?', [conversationId]);
        return rows;
    }
}

module.exports = Conversation;
