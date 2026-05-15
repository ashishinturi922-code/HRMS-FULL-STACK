const mysql = require('mysql2');
require('dotenv').config();

// Fail fast if critical env vars are missing
if (!process.env.DB_PASSWORD) {
    console.error('❌ DB_PASSWORD is not set in .env  — refusing to start with a default password.');
    process.exit(1);
}

const pool = mysql.createPool({
    host:             process.env.DB_HOST     || 'localhost',
    user:             process.env.DB_USER     || 'root',
    password:         process.env.DB_PASSWORD,           // no fallback — must be set
    database:         process.env.DB_NAME     || 'addition_db',
    waitForConnections: true,
    connectionLimit:  50,    // Fix #8: raised from 10 → 50 for 80-200 concurrent users
    queueLimit:       100,   // queue up to 100 requests instead of unlimited (prevents memory blowout)
    connectTimeout:   10000
});

const promisePool = pool.promise();

// Test connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('   Check: MySQL is running, .env credentials are correct, and "' + (process.env.DB_NAME || 'addition_db') + '" exists');
    } else {
        console.log('✅ Database connected successfully (pool limit: 50)');
        connection.release();
    }
});

module.exports = promisePool;
