import { supabase } from "./supabase";

export const requestPasswordReset = async (email) => {
  try {
    console.log("[PASSWORD_RESET] Starting request for email:", email);

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, nama_lengkap")
      .eq("email", email)
      .single();

    if (userError || !userData) {
      console.warn("[PASSWORD_RESET] User not found:", email);
      return {
        success: false,
        error: "Email tidak terdaftar dalam sistem",
      };
    }

    console.log("[PASSWORD_RESET] User found:", userData.id);

    const resetToken = `${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("[PASSWORD_RESET] Inserting reset token to database");

    const { error: insertError } = await supabase.from("password_resets").insert({
      user_id: userData.id,
      email: userData.email,
      reset_token: resetToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used: false,
    });

    if (insertError) throw insertError;

    console.log("[PASSWORD_RESET] Reset token inserted successfully");

    const resetLink = `${window.location.origin}/reset-password/${resetToken}`;

    console.log("[PASSWORD_RESET] Reset link generated:", resetLink);
    console.log("[PASSWORD_RESET] Invoking Resend email function");

    try {
      const { data: emailResponse, error: sendError } = await supabase.functions.invoke("send-reset-password-email", {
        body: {
          email: userData.email,
          nama_lengkap: userData.nama_lengkap,
          resetLink: resetLink,
        },
      });

      if (sendError) {
        console.error("[PASSWORD_RESET] Email send error:", sendError);
        return {
          success: false,
          error: sendError.message || "Gagal mengirim email reset password",
        };
      }

      console.log("[PASSWORD_RESET] Email sent successfully:", emailResponse);

      return {
        success: true,
        message: "Link reset password telah dikirim ke email Anda",
        resetToken,
        emailSent: true,
      };
    } catch (emailError) {
      console.error("[PASSWORD_RESET] Email service exception:", emailError);
      return {
        success: false,
        error: emailError.message || "Gagal mengirim email reset password",
      };
    }
  } catch (error) {
    console.error("[PASSWORD_RESET] Exception in requestPasswordReset:", error);
    return {
      success: false,
      error: error.message || "Gagal memproses permintaan reset password",
    };
  }
};

export const validateResetToken = async (resetToken) => {
  try {
    console.log("[PASSWORD_RESET] Validating token:", resetToken);

    const { data, error } = await supabase
      .from("password_resets")
      .select("*")
      .eq("reset_token", resetToken)
      .eq("used", false)
      .single();

    if (error || !data) {
      console.warn("[PASSWORD_RESET] Token validation failed - not found");
      return {
        success: false,
        error: "Token tidak valid atau telah expired",
      };
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);

    console.log("[PASSWORD_RESET] Token found, checking expiration");
    console.log("[PASSWORD_RESET] Now:", now.toISOString());
    console.log("[PASSWORD_RESET] Expires at:", expiresAt.toISOString());

    if (expiresAt < now) {
      console.warn("[PASSWORD_RESET] Token has expired");
      return {
        success: false,
        error: "Token telah kadaluarsa",
      };
    }

    console.log("[PASSWORD_RESET] Token is valid");

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("[PASSWORD_RESET] Exception in validateResetToken:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const resetPassword = async (resetToken, newPassword) => {
  try {
    console.log("[PASSWORD_RESET] Starting password reset process");

    const validation = await validateResetToken(resetToken);
    if (!validation.success) {
      return validation;
    }

    const resetData = validation.data;

    console.log("[PASSWORD_RESET] Updating password for user:", resetData.user_id);

    // HANYA update tabel users - ini cukup untuk login aplikasi Anda
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", resetData.user_id);

    if (updateError) throw updateError;

    console.log("[PASSWORD_RESET] User password updated in database");

    const { error: markError } = await supabase
      .from("password_resets")
      .update({ used: true })
      .eq("reset_token", resetToken);

    if (markError) throw markError;

    console.log("[PASSWORD_RESET] Password reset completed successfully");

    return {
      success: true,
      message: "Password berhasil direset",
    };
  } catch (error) {
    console.error("[PASSWORD_RESET] Exception in resetPassword:", error);
    return {
      success: false,
      error: error.message || "Gagal mereset password",
    };
  }
};
