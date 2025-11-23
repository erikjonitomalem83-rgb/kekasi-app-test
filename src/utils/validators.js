// utils/validators.js

// Validasi kode masalah (hanya huruf, max 2)
export const validateKodeMasalah = (value) => {
  return /^[A-Z]{0,2}$/.test(value);
};

// Validasi sub masalah (hanya angka, max 2 digit)
export const validateSubMasalah = (value) => {
  return /^\d{0,2}$/.test(value);
};

// Validasi nomor urut (1-99999)
export const validateNomorUrut = (value) => {
  const num = parseInt(value);
  return !isNaN(num) && num >= 1 && num <= 99999;
};

// Validasi kode kanwil/UPT (huruf + angka + titik)
export const validateKodeKanwilUPT = (value) => {
  // Remove spasi, uppercase
  const cleaned = value.toUpperCase().replace(/\s/g, "");
  // Format: min 3 karakter, bisa ada titik
  return /^[A-Z0-9.]{3,10}$/.test(cleaned);
};

// Format kode kanwil/UPT (auto uppercase, remove spasi)
export const formatKodeKanwilUPT = (value) => {
  return value.toUpperCase().replace(/\s/g, "");
};

// Validasi input hanya angka
export const validateOnlyNumbers = (value) => {
  return /^\d*$/.test(value);
};

// Pad angka dengan 0 di depan
export const padWithZero = (value, length = 2) => {
  return String(value).padStart(length, "0");
};
