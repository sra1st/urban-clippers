import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

const g = globalThis as unknown as { __ucPool?: Pool };

function createPool(): Pool {
  const ssl = process.env.DB_SSL !== "false";
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: ssl ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 4,
    maxIdle: 2,
    idleTimeout: 30_000,
    enableKeepAlive: true,
    connectTimeout: 15_000,
    // DATE / TIME / DATETIME come back as plain strings: no timezone surprises.
    dateStrings: true,
  });
}

export const pool: Pool = g.__ucPool ?? (g.__ucPool = createPool());

export type Db = Pool | PoolConnection;
export type Param = string | number | null;

export async function q<T extends RowDataPacket>(db: Db, sql: string, params: Param[] = []): Promise<T[]> {
  const [rows] = await db.execute<T[]>(sql, params);
  return rows;
}

export async function x(db: Db, sql: string, params: Param[] = []): Promise<ResultSetHeader> {
  const [res] = await db.execute<ResultSetHeader>(sql, params);
  return res;
}

export async function withTx<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* connection already gone */
    }
    throw err;
  } finally {
    conn.release();
  }
}

type DbError = { errno?: number; code?: string; message?: string };

/** Duplicate key (MySQL 1062). Optionally match a specific index name in the message. */
export function isDuplicate(err: unknown, index?: string): boolean {
  const e = err as DbError;
  if (e?.errno !== 1062 && e?.code !== "ER_DUP_ENTRY") return false;
  return index ? String(e.message ?? "").includes(index) : true;
}

/** Deadlock, lock timeout, or TiDB write conflict: safe to try another barber or retry. */
export function isRetryable(err: unknown): boolean {
  const e = err as DbError;
  return [1213, 1205, 8002, 8022, 9007].includes(e?.errno ?? 0);
}

export type { PoolConnection, ResultSetHeader, RowDataPacket };
