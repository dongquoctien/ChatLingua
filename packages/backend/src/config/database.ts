import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'chatlingua',
  password: process.env.DB_PASSWORD || 'chatlingua_pass',
  database: process.env.DB_NAME || 'chatlingua',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
