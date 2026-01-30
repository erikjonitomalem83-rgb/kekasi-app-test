import { supabase } from "./supabase";
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Get list of auto rekap logs
 */
export async function getRekapLogs(limit = 30) {
  try {
    await supabase.auth.getSession();

    const { data, error } = await supabase
      .from("auto_rekap_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("[rekapService] Error fetching logs:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get rekap files from Supabase Storage
 */
export async function getRekapFiles(folder = "harian", year = null, month = null) {
  try {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    const currentMonth = month || String(now.getMonth() + 1).padStart(2, "0");

    // Tahunan folder doesn't use month subfolders
    const path = folder === "tahunan" ? `${folder}/${currentYear}` : `${folder}/${currentYear}/${currentMonth}`;

    const { data, error } = await supabase.storage.from("rekap-files").list(path, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) throw error;

    // Get public URLs for each file
    const filesWithUrls = (data || []).map((file) => {
      const filePath = `${path}/${file.name}`;
      const { data: urlData } = supabase.storage.from("rekap-files").getPublicUrl(filePath);
      return {
        ...file,
        path: filePath,
        publicUrl: urlData?.publicUrl,
      };
    });

    return { success: true, data: filesWithUrls };
  } catch (error) {
    console.error("[rekapService] Error fetching files:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Download rekap file
 */
export async function downloadRekapFile(filePath) {
  try {
    const { data, error } = await supabase.storage.from("rekap-files").download(filePath);

    if (error) throw error;

    // Create blob and trigger download
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filePath.split("/").pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("[rekapService] Error downloading file:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete rekap file
 */
export async function deleteRekapFile(filePath) {
  try {
    // Gunakan supabaseAdmin untuk bypass RLS jika anon client gagal
    const { data, error } = await supabaseAdmin.storage.from("rekap-files").remove([filePath]);

    if (error) throw error;

    // Validasi apakah file benar-benar terhapus (data berisi list path yang berhasil dihapus)
    if (!data || data.length === 0) {
      throw new Error("File tidak ditemukan atau gagal dihapus dari storage");
    }

    return { success: true };
  } catch (error) {
    console.error("[rekapService] Error deleting file:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Trigger manual rekap generation
 */
export async function triggerManualRekap() {
  try {
    const { data, error } = await supabase.functions.invoke("auto-rekap-harian", {
      body: {},
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("[rekapService] Error triggering rekap:", error);
    return { success: false, error: error.message };
  }
}
