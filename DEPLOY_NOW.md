# 🚀 Langkah Deployment KEKASI ke Vercel

Repository GitHub Anda: **erikjonitomalem83-rgb/kekasi-app-test**

File konfigurasi sudah di-push ke GitHub! Sekarang Anda siap untuk deploy.

---

## 🎯 Pilihan Deployment

### **OPSI 1: Deploy via Vercel Dashboard (TERMUDAH - DIREKOMENDASIKAN)**

#### Langkah 1: Login ke Vercel

1. Buka [vercel.com](https://vercel.com)
2. Klik **"Sign Up"** atau **"Login"**
3. Login dengan **GitHub** (pilih opsi "Continue with GitHub")
4. Authorize Vercel untuk akses GitHub Anda

#### Langkah 2: Import Project

1. Setelah login, klik **"Add New..."** → **"Project"**
2. Anda akan melihat list repository GitHub Anda
3. Cari **"kekasi-app-test"** dan klik **"Import"**

#### Langkah 3: Configure Project

Vercel akan otomatis mendeteksi settingan:

- **Framework Preset**: Vite ✅ (auto-detected)
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅

**Jangan ubah apapun**, langsung scroll ke bawah.

#### Langkah 4: Tambahkan Environment Variables

Klik **"Environment Variables"** dan tambahkan satu per satu:

| Name                             | Value                                                 |
| -------------------------------- | ----------------------------------------------------- |
| `VITE_SUPABASE_URL`              | `https://gjrwfybywnthnhapjsyol.supabase.co`           |
| `VITE_SUPABASE_ANON_KEY`         | _[Ambil dari Supabase Dashboard]_                     |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | _[Ambil dari Supabase Dashboard]_                     |
| `VITE_APP_NAME`                  | `KEKASI`                                              |
| `VITE_RESERVE_TIMEOUT`           | `5`                                                   |
| `VITE_APP_URL`                   | `https://kekasi-app-test.vercel.app` (atau sesuaikan) |
| `VITE_RESEND_FROM_EMAIL`         | `onboarding@resend.dev`                               |
| `RESEND_API_KEY`                 | _[Jika ada, dari Resend Dashboard]_                   |

**Cara mendapatkan Supabase Keys:**

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik **Settings** (⚙️) → **API**
4. Copy:
   - **Project URL** → sudah ada di atas
   - **anon/public key** → untuk `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → untuk `VITE_SUPABASE_SERVICE_ROLE_KEY` (klik "Reveal" dulu)

#### Langkah 5: Deploy!

1. Klik **"Deploy"** (tombol biru besar)
2. Tunggu build process (1-3 menit)
3. Setelah selesai, Anda akan melihat 🎉 **Congratulations!**
4. Klik **"Visit"** untuk membuka aplikasi Anda

URL deployment Anda akan seperti:

```
https://kekasi-app-test.vercel.app
```

atau

```
https://kekasi-app-test-[random].vercel.app
```

---

### **OPSI 2: Deploy via Vercel CLI (UNTUK ADVANCED USER)**

#### Langkah 1: Install Vercel CLI

```powershell
npm install -g vercel
```

#### Langkah 2: Login

```powershell
vercel login
```

Masukkan email Anda dan klik link verifikasi.

#### Langkah 3: Deploy

```powershell
cd "d:\KEKASI-react - Vercel Deployment"
vercel
```

Jawab pertanyaan:

- **Set up and deploy?** → `Y`
- **Which scope?** → Pilih account Anda
- **Link to existing project?** → `N`
- **Project name?** → `kekasi-app-test` (atau nama lain)
- **In which directory?** → `./`

#### Langkah 4: Tambahkan Environment Variables

Via CLI atau via Dashboard Vercel (lebih mudah via dashboard).

#### Langkah 5: Deploy Production

```powershell
vercel --prod
```

---

## 🔧 PENTING: Update Supabase Redirect URLs

Setelah deployment berhasil, **WAJIB** lakukan ini:

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Pergi ke **Authentication** → **URL Configuration**
4. Di **Redirect URLs**, tambahkan:
   ```
   https://kekasi-app-test.vercel.app/**
   ```
   (ganti dengan URL Vercel Anda yang sebenarnya)
5. Di **Site URL**, isi:
   ```
   https://kekasi-app-test.vercel.app
   ```
6. Klik **Save**

**Jika tidak melakukan ini, login TIDAK akan berfungsi!**

---

## ✅ Testing Checklist

Setelah deploy, test aplikasi Anda:

- [ ] Buka URL Vercel
- [ ] Halaman login muncul dengan benar
- [ ] Coba login dengan akun test
- [ ] Cek dashboard dan fitur utama
- [ ] Buka browser console (F12) → cek tidak ada error merah
- [ ] Test di mobile (responsive)

---

## 🎨 Custom Domain (Opsional)

Jika Anda punya domain sendiri (contoh: `kekasi.com`):

1. Di Vercel Dashboard, buka project Anda
2. Klik **Settings** → **Domains**
3. Klik **"Add"**
4. Masukkan domain Anda
5. Ikuti instruksi untuk update DNS records di domain provider Anda
6. Tunggu propagasi (bisa 5 menit - 48 jam)
7. **Jangan lupa update** `VITE_APP_URL` dan Supabase Redirect URLs dengan domain baru!

---

## 🔄 Auto-Deploy

Setiap kali Anda push ke GitHub branch `main`, Vercel akan otomatis:

- Build ulang aplikasi
- Deploy ke production
- Update URL yang sama

Jadi untuk update aplikasi di masa depan:

```powershell
git add .
git commit -m "Update fitur X"
git push origin main
```

Vercel akan otomatis deploy! 🚀

---

## 🐛 Troubleshooting

### Build Failed

- Cek **Deployment Logs** di Vercel Dashboard
- Pastikan build berhasil lokal: `npm run build`
- Cek semua dependencies ada di `package.json`

### Login Tidak Berfungsi

- ✅ Pastikan Supabase Redirect URLs sudah diupdate
- ✅ Cek environment variables di Vercel
- ✅ Cek console browser untuk error messages

### Environment Variables Tidak Terbaca

- Pastikan nama variable diawali `VITE_`
- Setelah edit env vars, klik **"Redeploy"** di Vercel
- Vercel perlu rebuild untuk apply env vars baru

---

## 📞 Bantuan

Jika ada masalah:

1. Cek **Deployment Logs** di Vercel Dashboard
2. Baca `DEPLOYMENT_GUIDE.md` untuk detail lengkap
3. Tanya saya! 😊

---

## 🎉 Selamat Deploy!

Aplikasi KEKASI Anda sekarang live di internet! 🌐
