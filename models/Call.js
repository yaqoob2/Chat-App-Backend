const pool = require('../config/db');

class Call {
    static async create({ callerId, receiverId }) {
        const [result] = await pool.query(
            'INSERT INTO calls (caller_id, receiver_id, status) VALUES (?, ?, ?)',
            [callerId, receiverId, 'initiated']
        );
        return result.insertId;
    }

    static async updateStatus(callId, status) {
        const updates = { status };
        if (status === 'ended' || status === 'missed') {
            updates.end_time = new Date();
            await pool.query('UPDATE calls SET status = ?, end_time = ? WHERE id = ?', [status, new Date(), callId]);
        } else {
            await pool.query('UPDATE calls SET status = ? WHERE id = ?', [status, callId]);
        }
    }

    static async getHistory(userId) {
        const [rows] = await pool.query(`
      SELECT c.*, 
             u1.username as caller_name, u1.profile_picture as caller_avatar,
             u2.username as receiver_name, u2.profile_picture as receiver_avatar
      FROM calls c
      JOIN users u1 ON c.caller_id = u1.id
      JOIN users u2 ON c.receiver_id = u2.id
      WHERE c.caller_id = ? OR c.receiver_id = ?
      ORDER BY c.start_time DESC
    `, [userId, userId]);
        return rows;
    }
}

module.exports = Call;
