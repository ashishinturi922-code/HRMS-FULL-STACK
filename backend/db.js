const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
<<<<<<< HEAD
    password: process.env.DB_PASSWORD || 'password123',
=======
    password: process.env.DB_PASSWORD || '',
>>>>>>> 8123286f8c8411ce164d7e89a3eaee37521f5a5d
    database: process.env.DB_NAME || 'addition_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// ✅ Test connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('   Check: MySQL is running, credentials are correct, and "addition_db" exists');
    } else {
        console.log('✅ Database connected successfully');
        connection.release();
    }
});

module.exports = promisePool;