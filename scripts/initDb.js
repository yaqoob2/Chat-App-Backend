const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const initDb = async () => {
    try {
        // Create connection without database selected first
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        console.log(`Connected to MySQL server on port ${process.env.DB_PORT}`);

        // Read schema file
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon to get individual queries
        const queries = schemaSql.split(';').filter(query => query.trim().length > 0);

        for (const query of queries) {
            if (query.trim()) {
                await connection.query(query);
            }
        }

        console.log('Database initialization completed successfully!');
        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
};

initDb();
