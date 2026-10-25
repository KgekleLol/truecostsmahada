import { neon, Pool } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️ [Neon DB] Peringatan: DATABASE_URL belum diatur di environment variable.');
}

/**
 * Neon Serverless SQL Client (HTTP-based)
 * Direkomendasikan untuk Serverless / Edge Runtime di Vercel:
 * - Menggunakan protokol HTTPS stateless yang bebas dari timeout & pool exhaustion.
 * - Cold-start minimal (<10ms).
 */
export const sql = neon(databaseUrl || '');

/**
 * Neon Connection Pool Client (WebSocket-based)
 */
export const pool = new Pool({
  connectionString: databaseUrl || '',
});

export default sql;
