import { supabase } from "./supabase";

/**
 * Coba acquire lock untuk reserve nomor
 * Return: { success: true/false, locked: true/false, lockedBy, lockedAt }
 */
export async function acquireLock(userId, userName) {
  try {
    console.log(`[acquireLock] User ${userName} trying to acquire lock...`);

    // STEP 1: Cek status lock saat ini
    const { data: lockData, error: checkError } = await supabase.from("reserve_lock").select("*").eq("id", 1).single();

    if (checkError) {
      console.error("[acquireLock] Error checking lock:", checkError);
      throw checkError;
    }

    // STEP 2: Jika sudah locked oleh user lain, return failed
    if (lockData.is_locked && lockData.locked_by_user_id !== userId) {
      console.log(`[acquireLock] Already locked by ${lockData.locked_by_user_name}`);
      return {
        success: false,
        locked: true,
        lockedBy: lockData.locked_by_user_name,
        lockedAt: lockData.locked_at,
      };
    }

    // STEP 3: Jika sudah locked oleh user ini sendiri, return success
    if (lockData.is_locked && lockData.locked_by_user_id === userId) {
      console.log(`[acquireLock] User ${userName} already holds the lock`);
      return { success: true, locked: false };
    }

    // STEP 4: Coba acquire lock (simple update)
    const { data: updateData, error: updateError } = await supabase
      .from("reserve_lock")
      .update({
        is_locked: true,
        locked_by_user_id: userId,
        locked_by_user_name: userName,
        locked_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .eq("is_locked", false)
      .select();

    if (updateError) {
      console.error("[acquireLock] Update error:", updateError);

      // Recheck siapa yang dapat lock
      const { data: recheckData } = await supabase.from("reserve_lock").select("*").eq("id", 1).single();

      return {
        success: false,
        locked: true,
        lockedBy: recheckData?.locked_by_user_name,
        lockedAt: recheckData?.locked_at,
      };
    }

    // STEP 5: Verify update berhasil
    if (updateData && updateData.length > 0) {
      console.log(`[acquireLock] Lock acquired successfully by ${userName}`);
      return { success: true, locked: false };
    } else {
      console.log(`[acquireLock] Update returned empty (race condition)`);

      // Recheck lock status
      const { data: finalCheck } = await supabase.from("reserve_lock").select("*").eq("id", 1).single();

      // Cek apakah ternyata kita yang dapat lock
      if (finalCheck && finalCheck.locked_by_user_id === userId) {
        console.log(`[acquireLock] Lock acquired (verified)`);
        return { success: true, locked: false };
      }

      return {
        success: false,
        locked: true,
        lockedBy: finalCheck?.locked_by_user_name,
        lockedAt: finalCheck?.locked_at,
      };
    }
  } catch (error) {
    console.error("[acquireLock] Fatal error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Release lock setelah selesai reserve
 */
export async function releaseLock(userId) {
  try {
    console.log(`[releaseLock] User ${userId} releasing lock...`);

    const { error } = await supabase
      .from("reserve_lock")
      .update({
        is_locked: false,
        locked_by_user_id: null,
        locked_by_user_name: null,
        locked_at: null,
      })
      .eq("id", 1)
      .eq("locked_by_user_id", userId); // Hanya release jika kita yang punya

    if (error) throw error;

    console.log(`[releaseLock] Lock released successfully`);
    return { success: true };
  } catch (error) {
    console.error("[releaseLock] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cek status lock saat ini
 */
export async function checkLockStatus() {
  try {
    const { data, error } = await supabase.from("reserve_lock").select("*").eq("id", 1).single();

    if (error) throw error;

    return {
      success: true,
      isLocked: data.is_locked,
      lockedBy: data.locked_by_user_name,
      lockedByUserId: data.locked_by_user_id,
      lockedAt: data.locked_at,
    };
  } catch (error) {
    console.error("[checkLockStatus] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe ke perubahan lock status (real-time)
 */
export function subscribeToLockStatus(callback) {
  const channel = supabase
    .channel("reserve_lock_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "reserve_lock",
      },
      (payload) => {
        console.log("[subscribeToLockStatus] Lock status changed:", payload.new);
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Force release lock (untuk admin atau auto-timeout)
 */
export async function forceReleaseLock() {
  try {
    console.log("[forceReleaseLock] Force releasing lock...");

    const { error } = await supabase
      .from("reserve_lock")
      .update({
        is_locked: false,
        locked_by_user_id: null,
        locked_by_user_name: null,
        locked_at: null,
      })
      .eq("id", 1);

    if (error) throw error;

    console.log("[forceReleaseLock] Lock force released successfully");
    return { success: true };
  } catch (error) {
    console.error("[forceReleaseLock] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup lock saat logout (force release jika user hold lock)
 */
export async function cleanupOnLogout(userId) {
  try {
    console.log(`[cleanupOnLogout] Cleaning up lock for user ${userId}...`);

    // Cek apakah user ini yang hold lock
    const { data: lockData, error: checkError } = await supabase.from("reserve_lock").select("*").eq("id", 1).single();

    if (checkError) {
      console.error("[cleanupOnLogout] Error checking lock:", checkError);
      return { success: false, error: checkError.message };
    }

    // Jika user ini yang hold lock, release
    if (lockData && lockData.is_locked && lockData.locked_by_user_id === userId) {
      console.log(`[cleanupOnLogout] User ${userId} holds lock, releasing...`);

      const { error: releaseError } = await supabase
        .from("reserve_lock")
        .update({
          is_locked: false,
          locked_by_user_id: null,
          locked_by_user_name: null,
          locked_at: null,
        })
        .eq("id", 1)
        .eq("locked_by_user_id", userId);

      if (releaseError) {
        console.error("[cleanupOnLogout] Error releasing lock:", releaseError);

        // Jika gagal, coba force release
        console.log("[cleanupOnLogout] Attempting force release...");
        const forceResult = await forceReleaseLock();

        return {
          success: forceResult.success,
          forced: true,
          error: releaseError.message,
        };
      }

      console.log("[cleanupOnLogout] Lock released successfully");
      return { success: true, released: true };
    } else {
      console.log("[cleanupOnLogout] User does not hold lock, no action needed");
      return { success: true, released: false };
    }
  } catch (error) {
    console.error("[cleanupOnLogout] Fatal error:", error);

    // Last resort: force release
    try {
      console.log("[cleanupOnLogout] Fatal error, attempting force release...");
      await forceReleaseLock();
      return { success: true, forced: true, error: error.message };
    } catch {
      // Ignore force release error, just return original error
      return { success: false, error: error.message };
    }
  }
}
