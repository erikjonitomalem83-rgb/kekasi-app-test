export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).json({});
    return;
  }

  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
    return;
  }

  try {
    const { email, nama_lengkap, resetLink } = req.body;

    console.log("[VERCEL_API_BREVO] Request received:", { email, nama_lengkap });

    // Validate required fields
    if (!email || !resetLink) {
      console.error("[VERCEL_API_BREVO] Missing required fields");
      res.status(400).json({
        success: false,
        error: "Email and resetLink are required",
      });
      return;
    }

    // Get Brevo API key from environment
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    if (!BREVO_API_KEY) {
      console.error("[VERCEL_API_BREVO] BREVO_API_KEY not configured");
      res.status(500).json({
        success: false,
        error: "Email service not configured",
      });
      return;
    }

    console.log("[VERCEL_API_BREVO] Calling Brevo API");

    // Email template
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

    // Call Brevo API
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "KEKASI",
          email: "erikjonitomalem83@gmail.com",
        },
        to: [
          {
            email: email,
            name: nama_lengkap,
          },
        ],
        subject: emailSubject,
        htmlContent: emailContent,
      }),
    });

    const responseData = await brevoResponse.json();
    console.log("[VERCEL_API_BREVO] Brevo response status:", brevoResponse.status);

    if (!brevoResponse.ok) {
      console.error("[VERCEL_API_BREVO] Brevo API error:", responseData);
      res.status(500).json({
        success: false,
        error: responseData.message || "Failed to send email",
      });
      return;
    }

    console.log("[VERCEL_API_BREVO] Email sent successfully, ID:", responseData.messageId);

    res.status(200).json({
      success: true,
      message: "Email reset password berhasil dikirim",
      emailId: responseData.messageId,
    });
  } catch (error) {
    console.error("[VERCEL_API_BREVO] Exception caught:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}
