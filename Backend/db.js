const mysql = require("mysql2");
require("dotenv").config();

// Create a connection pool (not a single connection)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

// Test the connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }
    console.log("Connected to EcoReport MySQL database!");
    connection.release();
});

// Export the pool with promise support
module.exports = pool.promise();