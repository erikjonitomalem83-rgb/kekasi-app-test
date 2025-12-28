const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event, context) => {
  console.log("[NETLIFY_FUNCTION] Request received");
  console.log("[NETLIFY_FUNCTION] Method:", event.httpMethod);
  console.log("[NETLIFY_FUNCTION] Path:", event.path);

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Method not allowed" }),
    };
  }

  try {
    const { email, nama_lengkap, resetLink } = JSON.parse(event.body);

    console.log("[NETLIFY_FUNCTION] Request body:", { email, nama_lengkap });

    if (!email || !resetLink) {
      console.error("[NETLIFY_FUNCTION] Missing required fields");
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: "Email and resetLink are required",
        }),
      };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.error("[NETLIFY_FUNCTION] RESEND_API_KEY not configured");
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: "Email service not configured",
        }),
      };
    }

    console.log("[NETLIFY_FUNCTION] Calling Resend API");

    const emailSubject = "Reset Password - KEKASI";
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">KEKASI</h1>
          <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">Kode Klasifikasi Arsip Imigrasi Siantar</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Halo ${nama_lengkap},</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Kami menerima permintaan untuk mereset password akun KEKASI Anda. 
            Klik tombol di bawah ini untuk membuat password baru:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 20px 0;">
            <strong>Atau salin link berikut ke browser:</strong><br>
            <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 3px; word-break: break-all;">${resetLink}</code>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

          <p style="color: #888; font-size: 13px; margin: 15px 0;">
            <strong>Informasi Penting:</strong>
          </p>
          <ul style="color: #888; font-size: 13px; margin: 10px 0; padding-left: 20px;">
            <li>Link ini akan kadaluarsa dalam 24 jam</li>
            <li>Jika Anda tidak meminta reset password, abaikan email ini</li>
            <li>Jangan bagikan link ini kepada siapapun</li>
          </ul>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px;">
          <p>Pesan ini dikirim oleh sistem KEKASI. Jangan membalas email ini.</p>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "KEKASI <onboarding@resend.dev>",
        to: [email],
        subject: emailSubject,
        html: emailContent,
      }),
    });

    const responseData = await resendResponse.json();
    console.log("[NETLIFY_FUNCTION] Resend response:", responseData);

    if (!resendResponse.ok) {
      console.error("[NETLIFY_FUNCTION] Resend API error:", responseData);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: responseData.message || "Failed to send email",
        }),
      };
    }

    console.log("[NETLIFY_FUNCTION] Email sent successfully, ID:", responseData.id);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "Email reset password berhasil dikirim",
        emailId: responseData.id,
      }),
    };
  } catch (error) {
    console.error("[NETLIFY_FUNCTION] Exception caught:", error);
    console.error("[NETLIFY_FUNCTION] Error message:", error.message);

    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
    };
  }
};
