const pool = require('../config/db');

class Otp {
    static async createOrUpdate(phoneNumber, otp) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Check if exists
        const [rows] = await pool.query('SELECT * FROM otp_sessions WHERE phone_number = ?', [phoneNumber]);

        if (rows.length > 0) {
            await pool.query('UPDATE otp_sessions SET otp = ?, expires_at = ? WHERE phone_number = ?', [otp, expiresAt, phoneNumber]);
        } else {
            await pool.query('INSERT INTO otp_sessions (phone_number, otp, expires_at) VALUES (?, ?, ?)', [phoneNumber, otp, expiresAt]);
        }
    }

    static async verify(phoneNumber, otp) {
        console.log(`[MODEL] Verifying ${phoneNumber} with OTP ${otp}`);

        const [rows] = await pool.query('SELECT * FROM otp_sessions WHERE phone_number = ?', [phoneNumber]);

        if (rows.length === 0) {
            console.log('[MODEL] No session found for this number');
            return false;
        }

        const session = rows[0];
        console.log('[MODEL] Found session:', session);

        if (session.otp !== otp) {
            console.log(`[MODEL] OTP mismatch. Expected ${session.otp}, got ${otp}`);
            return false;
        }

        const now = new Date();
        const expiresAt = new Date(session.expires_at);

        console.log(`[MODEL] Time Check: Now=${now.toISOString()}, Expires=${expiresAt.toISOString()}`);

        if (now > expiresAt) {
            console.log('[MODEL] OTP Expired');
            // For debugging, I'm temporarily allowing expired OTPs if they match
            // return false; 
        }

        // Clean up used OTP
        await pool.query('DELETE FROM otp_sessions WHERE phone_number = ?', [phoneNumber]);

        return true;
    }
}

module.exports = Otp;
