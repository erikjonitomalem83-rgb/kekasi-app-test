import { supabase } from "./supabase";
let activeSessionChannel = null; // ← Global tracker untuk channel aktif

/**
 * Generate unique session token
 */
function generateSessionToken() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get device info
 */
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = "Unknown";

  if (ua.indexOf("Chrome") > -1) browser = "Chrome";
  else if (ua.indexOf("Firefox") > -1) browser = "Firefox";
  else if (ua.indexOf("Safari") > -1) browser = "Safari";
  else if (ua.indexOf("Edge") > -1) browser = "Edge";

  return `${browser} - ${navigator.platform}`;
}

/**
 * Create new session dan force logout session lama + cancel reserved numbers
 */
export async function createSession(userId) {
  try {
    const sessionToken = generateSessionToken();
    const deviceInfo = getDeviceInfo();

    console.log(`[Session] Creating new session for user ${userId}`);

    // STEP 1: Cancel reserved numbers dari session lama
    console.log("[Session] Checking for reserved numbers from old sessions...");

    try {
      const now = new Date().toISOString();

      const { data: cancelledNumbers, error: cancelError } = await supabase
        .from("nomor_surat")
        .update({
          status: "cancelled",
          cancelled_at: now,
          keterangan: null,
        })
        .eq("user_id", userId)
        .eq("status", "reserved")
        .select();

      if (cancelError) {
        console.error("[Session] Error cancelling old reserved numbers:", cancelError);
      } else if (cancelledNumbers && cancelledNumbers.length > 0) {
        console.log(`[Session] Cancelled ${cancelledNumbers.length} reserved numbers from previous session`);
      }
    } catch (cancelErr) {
      console.error("[Session] Cancel reserved numbers error:", cancelErr);
    }

    // STEP 2: Deactivate semua session lama
    const { error: deactivateError } = await supabase
      .from("user_sessions")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("[Session] Error deactivating old sessions:", deactivateError);
    }

    // STEP 3: Insert session baru
    const { data, error } = await supabase
      .from("user_sessions")
      .insert({
        user_id: userId,
        session_token: sessionToken,
        device_info: deviceInfo,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // STEP 4: Simpan token di localStorage
    localStorage.setItem("kekasi_session_token", sessionToken);

    console.log("[Session] Session created:", sessionToken);

    return { success: true, sessionToken };
  } catch (error) {
    console.error("[Session] Create error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate session
 */
export async function validateSession(userId) {
  try {
    const sessionToken = localStorage.getItem("kekasi_session_token");

    if (!sessionToken) {
      return { valid: false, reason: "NO_TOKEN" };
    }

    const { data, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("session_token", sessionToken)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { valid: false, reason: "INVALID_SESSION" };
    }

    // Update last_activity
    await supabase.from("user_sessions").update({ last_activity: new Date().toISOString() }).eq("id", data.id);

    return { valid: true, session: data };
  } catch (error) {
    console.error("[Session] Validate error:", error);
    return { valid: false, reason: "ERROR", error: error.message };
  }
}

/**
 * Destroy session dan cancel reserved numbers
 */
export async function destroySession(userId, cancelReservedNumbers = false) {
  try {
    const sessionToken = localStorage.getItem("kekasi_session_token");

    if (sessionToken) {
      await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("session_token", sessionToken);
    }

    // PENTING: Cancel reserved numbers jika diminta
    if (cancelReservedNumbers) {
      console.log(`[Session] Cancelling reserved numbers for user ${userId}...`);

      try {
        const now = new Date().toISOString();

        // Cancel semua nomor yang masih reserved oleh user ini
        const { data, error } = await supabase
          .from("nomor_surat")
          .update({
            status: "cancelled",
            cancelled_at: now,
            keterangan: null,
          })
          .eq("user_id", userId)
          .eq("status", "reserved")
          .select();

        if (error) {
          console.error("[Session] Error cancelling reserved numbers:", error);
        } else {
          console.log(`[Session] Cancelled ${data?.length || 0} reserved numbers`);
        }
      } catch (cancelErr) {
        console.error("[Session] Cancel error:", cancelErr);
      }
    }

    localStorage.removeItem("kekasi_session_token");

    return { success: true };
  } catch (error) {
    console.error("[Session] Destroy error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe ke session changes untuk detect force logout
 */
export function subscribeToSessionChanges(userId, onForceLogout) {
  const sessionToken = localStorage.getItem("kekasi_session_token");

  if (!sessionToken) {
    console.log("[sessionService] No session token, skipping subscription");
    return null;
  }

  // ✅ CRITICAL: Unsubscribe channel lama sebelum buat baru
  if (activeSessionChannel) {
    console.log("[sessionService] ⚠️ Found existing channel, unsubscribing...");
    try {
      activeSessionChannel.unsubscribe();
    } catch (err) {
      console.error("[sessionService] Error unsubscribing old channel:", err);
    }
    activeSessionChannel = null;
  }

  console.log("[sessionService] 🔔 Creating NEW session channel for user:", userId);

  const channel = supabase
    .channel(`session-${userId}-${Date.now()}`) // ← Unique channel name
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "user_sessions",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[Session] 📡 Change detected:", payload);

        // CRITICAL FIX: Detect when a DIFFERENT session becomes active
        // This means someone else logged in with our account
        if (payload.new.session_token !== sessionToken && payload.new.is_active) {
          console.log("[Session] 🚨 Force logout detected - DIFFERENT session is now active!");
          console.log("[Session] Our token:", sessionToken);
          console.log("[Session] New active token:", payload.new.session_token);
          onForceLogout();
        } else if (payload.new.session_token === sessionToken && !payload.new.is_active) {
          console.log("[Session] 🚨 Force logout detected - OUR session was deactivated!");
          onForceLogout();
        } else {
          console.log("[Session] ℹ️ Session change was for different session, ignoring");
        }
      }
    )
    .subscribe((status) => {
      console.log("[sessionService] Subscription status:", status);
    });

  // ✅ Simpan ke global tracker
  activeSessionChannel = channel;

  return channel;
}

// ✅ TAMBAHKAN cleanup function
export function cleanupSessionChannel() {
  if (activeSessionChannel) {
    console.log("[sessionService] 🧹 Cleaning up session channel");
    try {
      activeSessionChannel.unsubscribe();
    } catch (err) {
      console.error("[sessionService] Error cleaning up channel:", err);
    }
    activeSessionChannel = null;
  }
}
