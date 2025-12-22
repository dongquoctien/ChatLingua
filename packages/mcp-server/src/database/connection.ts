import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export class DatabaseConnection {
  private pool: Pool | null = null;

  async connect(): Promise<void> {
    if (this.pool) return;

    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chatlingua',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test connection
    const connection = await this.pool.getConnection();
    connection.release();
    console.error('Database connected successfully');
  }

  async query<T extends RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    const [rows] = await this.pool.query<T>(sql, params);
    return rows;
  }

  async execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
    return result;
  }

  async getConnection(): Promise<PoolConnection> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.getConnection();
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
