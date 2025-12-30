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
