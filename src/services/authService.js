// services/authService.js
import { supabase } from "./supabase";

/**
 * Login user dengan username dan password
 */
export async function login(username, password) {
  try {
    console.log("Login attempt:", { username });

    // Helper function untuk timeout
    const withTimeout = (promise, timeoutMs) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    };

    // 1. Cari user berdasarkan username (dengan timeout 15 detik + retry)
    let userData = null;
    let userError = null;

    // Retry up to 2 times
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Database query attempt ${attempt}/2...`);

        const result = await withTimeout(
          supabase.from("users").select("*").eq("username", username).eq("is_active", true).single(),
          15000
        );

        userData = result.data;
        userError = result.error;

        if (userData) {
          console.log("Database query successful");
          break;
        }

        if (userError) {
          throw userError;
        }
      } catch (queryError) {
        console.error(`Database query attempt ${attempt} failed:`, queryError.message);

        if (attempt === 2) {
          userError = queryError;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    if (userError || !userData) {
      throw new Error("Username tidak ditemukan");
    }

    // 2. Validasi password
    if (password !== userData.password) {
      throw new Error("Password salah");
    }

    // 3. Gunakan email asli dari database untuk Supabase Auth

    // 4. Create auth result dari database user (skip Supabase Auth)
    console.log("Creating auth result from database user");

    const authResult = {
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          user_metadata: {
            username: username,
            user_db_id: userData.id,
          },
        },
        session: {
          user: {
            id: userData.id,
            email: userData.email,
          },
        },
      },
      error: null,
    };

    // 6. Verify auth result
    if (authResult.error) {
      throw new Error("Gagal login: " + authResult.error.message);
    }

    if (!authResult.data?.user) {
      throw new Error("Login gagal: Data user tidak valid");
    }

    console.log("Login successful!");

    // Create session untuk enforce single login
    console.log("[AUTH] Attempting to create session for user:", userData.id);
    try {
      const { createSession } = await import("./sessionService");
      console.log("[AUTH] createSession imported successfully");

      const sessionResult = await createSession(userData.id);
      console.log("[AUTH] createSession result:", sessionResult);

      if (!sessionResult.success) {
        console.error("[AUTH] Failed to create session:", sessionResult.error);
      } else {
        console.log("[AUTH] ✅ Session created successfully!");
      }
    } catch (sessionError) {
      console.error("[AUTH] ❌ Error creating session:", sessionError);
      // Don't fail login if session creation fails
    }

    return {
      success: true,
      user: authResult.data.user,
      profile: userData,
      session: authResult.data.session,
    };
  } catch (error) {
    console.error("Login failed:", error);
    return {
      success: false,
      error: error.message || "Login gagal",
    };
  }
}

/**
 * Logout user - IMPROVED VERSION dengan Timeout Protection
 */
export async function logout() {
  try {
    console.log("Starting logout process...");

    // Destroy session dan cancel reserved numbers
    try {
      const kekasiAuth = localStorage.getItem("kekasi-auth");
      if (kekasiAuth) {
        const authData = JSON.parse(kekasiAuth);
        if (authData?.state?.user?.id) {
          const { destroySession } = await import("./sessionService");
          await destroySession(authData.state.user.id, true); // true = cancel reserved numbers
        }
      }
    } catch (sessionErr) {
      console.error("Session cleanup error:", sessionErr);
    }

    // CRITICAL: Set timeout untuk prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Logout timeout after 5 seconds")), 5000);
    });

    // 1. Try signOut dengan timeout protection
    try {
      await Promise.race([supabase.auth.signOut({ scope: "local" }), timeoutPromise]);
      console.log("SignOut completed");
    } catch (signOutError) {
      console.warn("SignOut failed or timed out:", signOutError.message);
      // Continue anyway - we'll force clear storage
    }

    // 2. Force clear localStorage (ALWAYS execute)
    console.log("Force clearing localStorage...");
    try {
      // Get all keys first
      const allKeys = Object.keys(localStorage);

      // Remove Supabase-related keys
      allKeys.forEach((key) => {
        if (key.startsWith("sb-") || key.includes("supabase")) {
          try {
            localStorage.removeItem(key);
            console.log(`Cleared: ${key}`);
          } catch (removeError) {
            console.warn(`Could not clear ${key}:`, removeError);
          }
        }
      });

      console.log("localStorage cleared");
    } catch (storageErr) {
      console.warn("Could not access localStorage:", storageErr);

      // Last resort: clear everything
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (clearAllError) {
        console.error("Failed to clear storage completely:", clearAllError);
      }
    }

    console.log("Logout successful");
    return { success: true };
  } catch (error) {
    console.error("Fatal logout error:", error);

    // EMERGENCY: Force clear everything
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log("Emergency clear completed");
    } catch (clearError) {
      console.error("Emergency clear failed:", clearError);
    }

    // Always return success to force logout
    return {
      success: true,
      forced: true,
      error: error.message,
    };
  }
}

/**
 * Get current session - SIMPLIFIED
 */
export async function getCurrentSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session) {
      return { success: false, session: null };
    }

    // Get username from metadata
    const username = session.user.user_metadata?.username;

    if (!username) {
      return { success: false, error: "Username not found in session" };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      return { success: false, error: "Profile not found" };
    }

    return {
      success: true,
      session,
      user: session.user,
      profile,
    };
  } catch (error) {
    console.error("Get session error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if user is authenticated
 */
export async function checkAuth() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Force clear all auth data (gunakan sebagai last resort)
 */
export async function forceLogout() {
  try {
    // 1. Try normal logout
    await supabase.auth.signOut({ scope: "local" });
  } catch (e) {
    console.warn("Normal logout failed, forcing clear:", e);
  }

  // 2. Clear localStorage
  try {
    localStorage.removeItem("supabase.auth.token");
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-")) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn("Could not clear localStorage:", e);
  }

  // 3. Reload page
  window.location.reload();
}
