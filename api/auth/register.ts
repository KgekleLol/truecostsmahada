import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { sql } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Hanya izinkan HTTP POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: `Metode ${req.method} tidak diizinkan. Gunakan metode POST.`,
    });
  }

  try {
    // Parsing body request (mendukung parsed object maupun raw JSON string)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let { username, password } = body;

    // Normalisasi string
    username = typeof username === 'string' ? username.trim() : '';
    password = typeof password === 'string' ? password : '';

    // ==========================================
    // 1. VALIDASI INPUT
    // ==========================================
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username wajib diisi.',
      });
    }

    if (/\s/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username tidak boleh mengandung spasi.',
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username minimal harus 3 karakter.',
      });
    }

    if (username.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Username maksimal 50 karakter.',
      });
    }

    // Karakter yang diizinkan: huruf, angka, underscore (_), tanda hubung (-), titik (.)
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username hanya boleh terdiri dari huruf, angka, underscore (_), atau titik (.).',
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password wajib diisi.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal harus 6 karakter.',
      });
    }

    // ==========================================
    // 2. CEK DUPLIKASI USERNAME
    // ==========================================
    const existingUsers = await sql`
      SELECT id, username FROM users 
      WHERE LOWER(username) = LOWER(${username}) 
      LIMIT 1
    `;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username sudah digunakan, silakan pilih username lain.',
      });
    }

    // ==========================================
    // 3. HASH PASSWORD MENGGUNAKAN BCRYPTJS
    // ==========================================
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ==========================================
    // 4. SIMPAN USER BARU KE DATABASE NEON
    // ==========================================
    const insertedUsers = await sql`
      INSERT INTO users (username, password)
      VALUES (${username}, ${hashedPassword})
      RETURNING id, username, created_at
    `;

    const newUser = insertedUsers[0];

    return res.status(201).json({
      success: true,
      message: 'Pendaftaran akun berhasil!',
      user: {
        id: newUser.id,
        username: newUser.username,
        createdAt: newUser.created_at,
      },
    });
  } catch (error: any) {
    console.error('API /api/auth/register Error:', error);

    // Antisipasi error PostgreSQL 23505 (unique_violation / race condition)
    if (error?.code === '23505' || String(error?.message).toLowerCase().includes('unique')) {
      return res.status(409).json({
        success: false,
        message: 'Username sudah digunakan, silakan pilih username lain.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat memproses registrasi.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    });
  }
}
