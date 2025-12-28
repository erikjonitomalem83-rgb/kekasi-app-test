// utils/formatters.js

// Auto uppercase dan format kode
export const formatKodeKanwil = (input) => {
  return input.toUpperCase().replace(/\s/g, "");
};

// Format nomor lengkap
export const formatNomorLengkap = (kode) => {
  const { kanwil, upt, masalah, sub1, sub2, urut } = kode;
  return `${kanwil}.${upt}-${masalah}.${sub1}.${sub2}-${urut}`;
};

// Pad angka dengan 0
export const padNumber = (num, length = 2) => {
  return String(num).padStart(length, "0");
};
