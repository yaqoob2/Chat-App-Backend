const pool = require('../config/db');

class Message {
  static async create({ conversationId, senderId, content, type = 'text', fileUrl = null }) {
    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, content, type, file_url, status) VALUES (?, ?, ?, ?, ?, ?)',
      [conversationId, senderId, content, type, fileUrl, 'sent']
    );

    // Fetch the created message with sender info
    const [rows] = await pool.query(`
      SELECT m.*, u.username as sender_name, u.profile_picture as sender_avatar 
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.id = ?
    `, [result.insertId]);

    return rows[0];
  }

  static async getByConversationId(conversationId, limit = 30, cursor = null) {
    let query = `
      SELECT m.*, u.username as sender_name, u.profile_picture as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
    `;
    const params = [conversationId];

    if (cursor) {
      query += ` AND m.id < ?`;
      params.push(cursor);
    }

    query += ` ORDER BY m.id DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(query, params);
    return rows.reverse(); // Return in chronological order
  }

  static async updateStatus(messageId, status) {
    let updateField = '';
    if (status === 'delivered') updateField = ', delivered_at = CURRENT_TIMESTAMP';
    if (status === 'read') updateField = ', read_at = CURRENT_TIMESTAMP, is_read = TRUE';

    await pool.query(`
            UPDATE messages 
            SET status = ?${updateField}
            WHERE id = ?
        `, [status, messageId]);
  }

  static async markAsRead(conversationId, readerId) {
    await pool.query(`
      UPDATE messages 
      SET is_read = TRUE, status = 'read', read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND sender_id != ? AND status != 'read'
    `, [conversationId, readerId]);
  }

  static async findById(messageId) {
    const [rows] = await pool.query(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );
    return rows[0];
  }

  static async delete(messageId) {
    await pool.query('DELETE FROM messages WHERE id = ?', [messageId]);
  }

  static async deleteByConversation(conversationId) {
    await pool.query('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
  }
}

module.exports = Message;
