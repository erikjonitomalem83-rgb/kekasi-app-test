import { useState } from "react";
import { supabase } from "../../services/supabase";
import { supabaseAdmin } from "../../services/supabaseAdmin";

export default function CreateUserModal({ isOpen, onClose, onSuccess, isSuperAdmin }) {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    nama_lengkap: "",
    nomor_hp: "",
    seksi: "",
    role: "user",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const seksiOptions = [
    "Seksi Lalintalkim",
    "Subseksi Lalin",
    "Subseksi Intal",
    "Seksi Inteldakim",
    "Subseksi Intel",
    "Subseksi Dakim",
    "Seksi Tikim",
    "Subseksi Infokim",
    "Subseksi Tikim",
    "Subbagian TU",
    "Urusan Keuangan",
    "Urusan Umum",
    "Urusan Kepeg",
    "Lainnya",
  ];

  const roleOptions = isSuperAdmin ? ["user", "admin", "superadmin"] : ["user"];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError("Email wajib diisi");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Format email tidak valid");
      return false;
    }

    if (!formData.username.trim()) {
      setError("Username wajib diisi");
      return false;
    }

    if (formData.username.length < 3) {
      setError("Username minimal 3 karakter");
      return false;
    }

    if (!formData.nama_lengkap.trim()) {
      setError("Nama lengkap wajib diisi");
      return false;
    }

    if (!formData.nomor_hp.trim()) {
      setError("Nomor HP wajib diisi");
      return false;
    }

    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(formData.nomor_hp.replace(/\s/g, ""))) {
      setError("Format nomor HP tidak valid (contoh: 081234567890 atau +6281234567890)");
      return false;
    }

    if (!formData.nomor_hp.trim()) {
      setError("Nomor HP wajib diisi");
      return false;
    }

    if (!formData.seksi.trim()) {
      setError("Seksi wajib dipilih");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Cek apakah email sudah ada
      const { data: existingEmail } = await supabase
        .from("users")
        .select("email")
        .eq("email", formData.email.toLowerCase())
        .single();

      if (existingEmail) {
        setError("Email sudah terdaftar");
        setIsSubmitting(false);
        return;
      }

      // Cek apakah username sudah ada
      const { data: existingUsername } = await supabase
        .from("users")
        .select("username")
        .eq("username", formData.username.toLowerCase())
        .single();

      if (existingUsername) {
        setError("Username sudah digunakan");
        setIsSubmitting(false);
        return;
      }

      // Generate password default (bisa diganti user nanti)
      const defaultPassword = "Password123!";

      // Buat user di auth menggunakan supabaseAdmin
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email.toLowerCase(),
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          username: formData.username.toLowerCase(),
        },
      });

      if (authError) throw authError;

      // Buat profile dengan password dan is_active
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: formData.email.toLowerCase(),
        username: formData.username.toLowerCase(),
        password: defaultPassword,
        nama_lengkap: formData.nama_lengkap,
        nomor_hp: formData.nomor_hp,
        seksi: formData.seksi,
        role: formData.role,
        is_active: true,
        created_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;

      // Format nomor HP untuk WhatsApp (hapus karakter non-digit)
      let waNumber = formData.nomor_hp.replace(/\D/g, "");
      // Jika diawali 0, ganti dengan 62
      if (waNumber.startsWith("0")) {
        waNumber = "62" + waNumber.substring(1);
      }
      // Jika tidak diawali 62, tambahkan 62
      if (!waNumber.startsWith("62")) {
        waNumber = "62" + waNumber;
      }

      // Buat pesan WhatsApp
      const waMessage = encodeURIComponent(
        `🎉 *Selamat Datang di KEKASI*\n` +
          `Kode Klasifikasi Arsip Imigrasi Siantar\n\n` +
          `Halo *${formData.nama_lengkap}*,\n\n` +
          `Akun Anda telah berhasil dibuat. Berikut informasi login Anda:\n\n` +
          `📧 *Email:* ${formData.email}\n` +
          `👤 *Username:* ${formData.username}\n` +
          `🔑 *Password:* ${defaultPassword}\n\n` +
          `⚠️ *PENTING:*\n` +
          `• Password ini bersifat sementara\n` +
          `• Segera ganti password setelah login pertama\n` +
          `• Jangan bagikan password ke siapapun\n\n` +
          `🔗 Login di: ${window.location.origin}/login\n\n` +
          `Jika mengalami kesulitan, silakan hubungi administrator.\n\n` +
          `_Pesan ini dikirim otomatis oleh sistem KEKASI_`
      );

      // Buat URL WhatsApp
      const waUrl = `https://wa.me/${waNumber}?text=${waMessage}`;

      // Buka WhatsApp di tab baru
      window.open(waUrl, "_blank");

      // Tampilkan notifikasi sukses dengan opsi kirim ulang
      onSuccess({
        message: `Akun berhasil dibuat!\n\n📱 WhatsApp akan terbuka otomatis untuk mengirim credentials ke:\n${formData.nama_lengkap} (${formData.nomor_hp})\n\nEmail: ${formData.email}\nPassword: ${defaultPassword}\n\n✅ Pastikan pesan WhatsApp terkirim!`,
        waUrl: waUrl, // Kirim URL juga untuk bisa kirim ulang
        credentials: {
          email: formData.email,
          username: formData.username,
          password: defaultPassword,
          nomor_hp: formData.nomor_hp,
        },
      });

      // Reset form
      setFormData({
        email: "",
        username: "",
        nama_lengkap: "",
        nomor_hp: "",
        seksi: "",
        role: "user",
      });

      onClose();
    } catch (err) {
      console.error("Error creating user:", err);
      setError(err.message || "Gagal membuat akun");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        email: "",
        username: "",
        nama_lengkap: "",
        seksi: "",
        role: "user",
      });
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Buat Akun Baru</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="contoh@email.com"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value.toLowerCase())}
              placeholder="username (min. 3 karakter)"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nama_lengkap}
              onChange={(e) => handleInputChange("nama_lengkap", e.target.value)}
              placeholder="Nama lengkap user"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
              Nomor HP/WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.nomor_hp}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9+]/g, "");
                handleInputChange("nomor_hp", value);
              }}
              placeholder="08xxx atau +628xxx"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
              Seksi <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.seksi}
              onChange={(e) => handleInputChange("seksi", e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:bg-gray-100"
            >
              <option value="">-- Pilih Seksi --</option>
              {seksiOptions.map((seksi) => (
                <option key={seksi} value={seksi}>
                  {seksi}
                </option>
              ))}
            </select>
          </div>

          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition disabled:bg-gray-100"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Info:</strong> Password default adalah <strong>Password123!</strong>
              <br />
              User dapat mengganti password setelah login pertama kali.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? "Membuat..." : "Buat Akun"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
