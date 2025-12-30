import { supabase } from "./supabase";

/**
 * Mengambil daftar hari libur berdasarkan tahun
 */
export async function getHolidays(tahun = null) {
  try {
    let query = supabase.from("hari_libur").select("*").order("tanggal", { ascending: true });

    if (tahun) {
      query = query.eq("tahun", tahun);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("[holidayService] Error fetching holidays:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Menambah hari libur baru
 */
export async function addHoliday(holidayData) {
  try {
    const { data, error } = await supabase
      .from("hari_libur")
      .insert({
        tanggal: holidayData.tanggal,
        nama_libur: holidayData.nama_libur,
        jenis: holidayData.jenis,
        tahun: new Date(holidayData.tanggal).getFullYear(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("[holidayService] Error adding holiday:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Menambah hari libur secara massal (Batch Insert)
 */
export async function bulkAddHolidays(dataArray) {
  try {
    // Sanitasi data: pastikan kolom yang masuk sesuai schema
    const sanitizedData = dataArray.map((h) => ({
      tanggal: h.tanggal,
      nama_libur: h.nama_libur,
      jenis: h.jenis,
      tahun: parseInt(h.tahun),
    }));

    const { data, error } = await supabase.from("hari_libur").insert(sanitizedData).select();

    if (error) throw error;
    return { success: true, count: data.length };
  } catch (error) {
    console.error("[holidayService] Error bulk adding holidays:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Menghapus hari libur
 */
export async function deleteHoliday(id) {
  try {
    const { error } = await supabase.from("hari_libur").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[holidayService] Error deleting holiday:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Menghapus semua hari libur (opsional berdasarkan tahun)
 */
export async function deleteAllHolidays(tahun = null) {
  try {
    let query = supabase.from("hari_libur").delete().neq("id", 0); // Hack to delete all if no filter

    if (tahun) {
      query = supabase.from("hari_libur").delete().eq("tahun", parseInt(tahun));
    }

    const { error } = await query;

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[holidayService] Error deleting all holidays:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update hari libur
 */
export async function updateHoliday(id, holidayData) {
  try {
    const { data, error } = await supabase
      .from("hari_libur")
      .update({
        tanggal: holidayData.tanggal,
        nama_libur: holidayData.nama_libur,
        jenis: holidayData.jenis,
        tahun: new Date(holidayData.tanggal).getFullYear(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("[holidayService] Error updating holiday:", error);
    return { success: false, error: error.message };
  }
}
