const pool = require('../config/db');

class User {
    static async findByPhone(phoneNumber) {
        const [rows] = await pool.query('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
        return rows[0];
    }

    static async create(phoneNumber) {
        const [result] = await pool.query('INSERT INTO users (phone_number) VALUES (?)', [phoneNumber]);
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async updateProfile(id, username, profilePicture) {
        await pool.query('UPDATE users SET username = ?, profile_picture = ? WHERE id = ?', [username, profilePicture, id]);
    }
}

module.exports = User;
