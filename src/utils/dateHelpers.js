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
    // GUNAKAN LOCAL parts (ASIA/JAKARTA)
    const { yyyy, mm, dd, dayOfWeek } = getLocalParts(current);
    const dateString = `${yyyy}-${mm}-${dd}`;

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
 * Utility to get accurate local date parts (Indonesia/GMT+7 context)
 */
export function getLocalParts(date = new Date()) {
  const d = new Date(date);
  // Force Asia/Jakarta timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type) => parts.find((p) => p.type === type).value;

  // Map short weekday to number (Sun=0, Mon=1, ..., Sat=6)
  const dayNames = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    yyyy: getPart("year"),
    mm: getPart("month"),
    dd: getPart("day"),
    dayOfWeek: dayNames[getPart("weekday")],
  };
}

/**
 * Returns YYYY-MM-DD based on local time
 */
export function getLocalDateString(date = new Date()) {
  const { yyyy, mm, dd } = getLocalParts(date);
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns YYYY-MM based on local time
 */
export function getLocalMonthString(date = new Date()) {
  const { yyyy, mm } = getLocalParts(date);
  return `${yyyy}-${mm}`;
}

/**
 * Cek apakah hari ini adalah hari libur/weekend dan dapatkan info warning untuk UI.
 * Digunakan untuk menampilkan peringatan jika tanggal surat akan mundur.
 *
 * @param {Array<string>} holidays - Array berisi string tanggal libur (format YYYY-MM-DD)
 * @returns {Object} - { isHolidayOrWeekend, effectiveDate, effectiveDateFormatted, crossesYear, showWarning, warningType }
 */
export function getDateWarningInfo(holidays = []) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Cek apakah hari ini adalah hari kerja
  const { yyyy, mm, dd, dayOfWeek } = getLocalParts(now);
  const todayString = `${yyyy}-${mm}-${dd}`;

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
  const [effYear, effMonth, effDay] = effectiveDate.split("-");
  const effectiveDateFormatted = `${parseInt(effDay)} ${months[parseInt(effMonth) - 1]} ${effYear}`;

  // Tentukan nama hari untuk ditampilkan di warning
  let dayType = "";
  if (isHoliday) {
    dayType = "Hari Libur";
  } else if (dayOfWeek === 0) {
    dayType = "Hari Minggu";
  } else if (dayOfWeek === 6) {
    dayType = "Hari Sabtu";
  }

  return {
    isHolidayOrWeekend,
    effectiveDate,
    effectiveDateFormatted,
    crossesYear,
    dayType,
    // Tampilkan warning jika hari ini bukan hari kerja
    showWarning: isHolidayOrWeekend,
  };
}
