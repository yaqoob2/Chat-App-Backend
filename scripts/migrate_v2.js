const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'unified_comm_app',
            multipleStatements: true
        });

        console.log('Connected to MySQL. applying migration...');

        // Add columns if they don't exist
        try {
            await connection.query(`
                ALTER TABLE messages 
                ADD COLUMN status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
                ADD COLUMN delivered_at TIMESTAMP NULL,
                ADD COLUMN read_at TIMESTAMP NULL;
            `);
            console.log('Migration successful: Added status columns to messages table.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Columns already exist, skipping.');
            } else {
                console.error('Migration error:', err.message);
            }
        }

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('DB Connection Error:', error);
        process.exit(1);
    }
};

migrate();
