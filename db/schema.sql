-- ==============================================================================
-- SKEMA TABEL USERS UNTUK NEON POSTGRESQL
-- Jalankan query ini di Neon Console SQL Editor (https://console.neon.tech)
-- ==============================================================================

-- 1. Opsi A: Menggunakan SERIAL PRIMARY KEY (Direkomendasikan untuk struktur sederhana)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pencarian case-insensitive untuk efisiensi lookup username saat registrasi / login
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));

-- ==============================================================================
-- 2. Opsi B: Alternatif menggunakan UUID PRIMARY KEY
-- Jika proyek Anda lebih menyukai UUID (misalnya untuk skalabilitas multi-tenant):
--
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--
-- CREATE TABLE IF NOT EXISTS users_uuid (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     username VARCHAR(50) UNIQUE NOT NULL,
--     password VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uuid_username_lower ON users_uuid (LOWER(username));
-- ==============================================================================
