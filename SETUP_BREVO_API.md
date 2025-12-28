# 🔧 Langkah Terakhir: Tambahkan Brevo API Key ke Vercel

Code sudah di-push ke GitHub! Vercel sedang auto-deploy sekarang (tunggu 1-2 menit).

---

## 📝 Yang Harus Anda Lakukan:

### **STEP 1: Ambil Brevo API Key**

Di tab Brevo yang sudah terbuka:

1. Klik **dropdown nama Anda** di kanan atas (Kanim Siantar)
2. Pilih **"Settings"**
3. Di sidebar kiri, klik **"SMTP & API"**
4. Klik tab **"API Keys"**
5. Anda akan melihat API key yang sudah ada, atau buat baru:
   - Jika sudah ada: Klik **"Show"** atau **ikon mata** untuk melihat key
   - Jika belum ada: Klik **"Generate a new API key"**, beri nama (contoh: "KEKASI Production"), lalu **"Generate"**
6. **Copy** API key tersebut (simpan di Notepad dulu)

> ⚠️ **PENTING**: API key hanya ditampilkan sekali! Jika hilang, harus buat baru.

---

### **STEP 2: Tambahkan ke Vercel**

1. **Buka Vercel Dashboard**: [https://vercel.com/erik-jonito-malems-projects/kekasi-app-test](https://vercel.com)
2. Klik **"Settings"** (menu atas)
3. Klik **"Environment Variables"** (sidebar kiri)
4. Klik **"Add New"** atau tombol **+**
5. Isi form:
   - **Key**: `BREVO_API_KEY`
   - **Value**: (paste API key dari Brevo)
   - **Environments**: Centang **Production**, **Preview**, dan **Development** (semua)
6. Klik **"Save"**

---

### **STEP 3: Redeploy Aplikasi**

Setelah menambahkan environment variable:

1. Klik **"Deployments"** (menu atas)
2. Cari deployment paling atas (yang terbaru)
3. Klik **titik tiga (...)** di sebelah kanan
4. Klik **"Redeploy"**
5. Pilih **"Production"**
6. Klik **"Redeploy"**
7. Tunggu build selesai (1-2 menit)

---

### **STEP 4: Test Reset Password**

Setelah redeploy selesai:

1. Buka `https://kekasi-app-test.vercel.app`
2. Klik **"Lupa Password?"**
3. Masukkan email yang terdaftar (contoh: `dapotsjabir@gmail.com`)
4. Klik **"Kirim Link Reset"**
5. **Cek email inbox** - email dari KEKASI seharusnya masuk
6. Klik link di email
7. Masukkan password baru
8. Login dengan password baru

---

## ✅ Checklist:

- [ ] Ambil Brevo API Key dari dashboard
- [ ] Tambahkan `BREVO_API_KEY` di Vercel Environment Variables
- [ ] Redeploy aplikasi
- [ ] Test reset password
- [ ] Verifikasi email terkirim
- [ ] Test login dengan password baru

---

## 🐛 Jika Ada Masalah:

### Email Tidak Terkirim

- Cek apakah `BREVO_API_KEY` sudah ditambahkan di Vercel
- Cek apakah sudah redeploy setelah menambahkan key
- Cek console browser (F12) untuk error messages

### Error 500

- Kemungkinan API key salah atau expired
- Buat API key baru di Brevo dan update di Vercel

### Email Masuk ke Spam

- Cek folder Spam/Junk di email
- Tandai sebagai "Not Spam"

---

**Silakan lakukan STEP 1-4 sekarang!** Screenshot jika ada yang bingung atau error. 😊
