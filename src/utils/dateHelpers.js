/**
 * Menghitung tanggal kerja efektif (Administrative Date).
 * Jika tanggal yang diperiksa adalah weekend atau ada dalam daftar hari libur,
 * maka akan mundur 1 hari secara rekursif sampai menemukan hari kerja.
 *
 * @param {Date|string} checkDate - Tanggal yang ingin dicek
 * @param {Array<string>} holidays - Array berisi string tanggal libur (format YYYY-MM-DD)
 * @returns {string} - Tanggal kerja efektif dalam format YYYY-MM-DD
 */
export function getEffectiveWorkingDate(checkDate, holidays = []) {
  let current = new Date(checkDate);

  // Pastikan holidays adalah array string untuk pencarian yang mudah
  const holidaySet = new Set(holidays);

  while (true) {
    const dayOfWeek = current.getDay(); // 0 = Minggu, 6 = Sabtu

    // GUNAKAN LOCAL TIME, JANGAN toISOString() (karena akan convert ke UTC)
    // Masalah: 1 Jan 01:00 WIB (UTC+7) -> toISOString() jadi 31 Des 18:00 UTC
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(dateString);

    if (isWeekend || isHoliday) {
      // Jika sabtu/minggu/libur, mundur 1 hari
      current.setDate(current.getDate() - 1);
    } else {
      // Menemukan hari kerja
      return dateString;
    }
  }
}

/**
 * Cek apakah hari ini adalah hari libur/weekend dan dapatkan info warning untuk UI.
 * Digunakan untuk menampilkan peringatan jika tanggal surat akan mundur ke tahun sebelumnya.
 *
 * @param {Array<string>} holidays - Array berisi string tanggal libur (format YYYY-MM-DD)
 * @returns {Object} - { isHolidayOrWeekend, effectiveDate, effectiveDateFormatted, crossesYear }
 */
export function getDateWarningInfo(holidays = []) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Januari

  // Hanya tampilkan warning jika di awal tahun (Januari)
  // karena hanya awal tahun yang bisa mundur ke tahun sebelumnya
  const isJanuary = currentMonth === 0;

  // Cek apakah hari ini adalah hari kerja
  const todayYear = now.getFullYear();
  const todayMonth = String(now.getMonth() + 1).padStart(2, "0");
  const todayDay = String(now.getDate()).padStart(2, "0");
  const todayString = `${todayYear}-${todayMonth}-${todayDay}`;

  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const holidaySet = new Set(holidays);
  const isHoliday = holidaySet.has(todayString);
  const isHolidayOrWeekend = isWeekend || isHoliday;

  // Hitung tanggal efektif
  const effectiveDate = getEffectiveWorkingDate(now, holidays);
  const effectiveYear = parseInt(effectiveDate.substring(0, 4));

  // Cek apakah mundur ke tahun sebelumnya
  const crossesYear = effectiveYear < currentYear;

  // Format tanggal untuk display (contoh: "31 Desember 2025")
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const [yy, mm, dd] = effectiveDate.split("-");
  const effectiveDateFormatted = `${parseInt(dd)} ${months[parseInt(mm) - 1]} ${yy}`;

  return {
    isHolidayOrWeekend,
    effectiveDate,
    effectiveDateFormatted,
    crossesYear,
    showWarning: isJanuary && crossesYear && isHolidayOrWeekend,
  };
}
