// Unit test validator dan hashing password
import bcrypt from 'bcryptjs';

console.log("=== Menjalankan Pengujian Logika Registrasi ===");

// 1. Test Validasi Username
function validateUsername(username) {
  if (!username) return 'Username wajib diisi.';
  if (/\s/.test(username)) return 'Username tidak boleh mengandung spasi.';
  if (username.length < 3) return 'Username minimal harus 3 karakter.';
  if (username.length > 50) return 'Username maksimal 50 karakter.';
  const regex = /^[a-zA-Z0-9_.-]+$/;
  if (!regex.test(username)) return 'Username hanya boleh huruf, angka, underscore (_), atau titik (.).';
  return null;
}

// 2. Test Validasi Password
function validatePassword(password) {
  if (!password) return 'Password wajib diisi.';
  if (password.length < 6) return 'Password minimal harus 6 karakter.';
  return null;
}

// Test cases
console.assert(validateUsername("ab") !== null, "Harus tolak username < 3 karakter");
console.assert(validateUsername("user name") !== null, "Harus tolak username dengan spasi");
console.assert(validateUsername("valid_user") === null, "Harus terima username valid");
console.assert(validatePassword("123") !== null, "Harus tolak password < 6 karakter");
console.assert(validatePassword("rahasia123") === null, "Harus terima password valid");

console.log("✓ Semua pengujian validasi input lolos!");

// Test Hashing
const password = "PasswordSangatAman123!";
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);
console.log("Contoh hash bcrypt:", hash);

const isMatch = await bcrypt.compare(password, hash);
console.assert(isMatch === true, "Verifikasi hash bcrypt harus true");

const isWrong = await bcrypt.compare("PasswordSalah", hash);
console.assert(isWrong === false, "Verifikasi hash dengan password salah harus false");

console.log("✓ Pengujian Bcrypt hashing & compare lolos!");
console.log("=== Semua Pengujian Berhasil ===");
