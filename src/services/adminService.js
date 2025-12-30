import { supabase } from "./supabase";

/**
 * Update user data (Admin only)
 * @param {string} userId - ID user yang akan diedit
 * @param {object} updates - Object data yang akan diupdate
 */
export async function updateUserData(userId, updates) {
  try {
    // Validasi basic
    if (!userId) throw new Error("User ID is required");

    // Lakukan update
    const { data, error } = await supabase.from("users").update(updates).eq("id", userId).select().single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete user (Admin only)
 * @param {string} userId - ID user yang akan dihapus
 */
export async function deleteUser(userId) {
  try {
    if (!userId) throw new Error("User ID is required");

    // Delete user
    // Note: Karena constraint foreign key, user mungkin tidak bisa dihapus kalau sudah punya data relasi.
    // Idealnya soft delete (is_active: false), tapi user minta hapus.
    // Kita coba hard delete dulu.
    const { error } = await supabase.from("users").delete().eq("id", userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
}
