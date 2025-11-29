# 🚀 Panduan Deploy KEKASI ke Vercel

Panduan lengkap untuk deploy aplikasi KEKASI React ke Vercel.

## 📋 Prasyarat

- [x] Project React sudah siap
- [ ] Akun Vercel (gratis di [vercel.com](https://vercel.com))
- [ ] Repository GitHub (opsional, tapi direkomendasikan)
- [ ] Environment variables dari Supabase

---

## 🎯 Metode Deployment

Ada 2 cara untuk deploy ke Vercel:

### **Metode 1: Deploy via Vercel Dashboard (Direkomendasikan untuk Pemula)**

### **Metode 2: Deploy via Vercel CLI (Lebih Cepat)**

---

## 📦 Metode 1: Deploy via Vercel Dashboard

### Langkah 1: Push ke GitHub

Jika belum ada repository GitHub:

```bash
# Inisialisasi git (jika belum)
git init

# Tambahkan semua file
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Buat repository baru di GitHub, lalu:
git remote add origin https://github.com/username/kekasi-app.git
git branch -M main
git push -u origin main
```

### Langkah 2: Import Project ke Vercel

1. Buka [vercel.com](https://vercel.com) dan login
2. Klik **"Add New Project"**
3. Pilih **"Import Git Repository"**
4. Pilih repository **kekasi-app** Anda
5. Vercel akan otomatis mendeteksi framework **Vite**

### Langkah 3: Konfigurasi Project

Vercel akan menampilkan halaman konfigurasi:

- **Project Name**: `kekasi-app` (atau nama yang Anda inginkan)
- **Framework Preset**: Vite (otomatis terdeteksi)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (otomatis)
- **Output Directory**: `dist` (otomatis)

### Langkah 4: Tambahkan Environment Variables

Klik **"Environment Variables"** dan tambahkan:

| Name                             | Value                                       |
| -------------------------------- | ------------------------------------------- |
| `VITE_SUPABASE_URL`              | `https://gjrwfybywnthnhapjsyol.supabase.co` |
| `VITE_SUPABASE_ANON_KEY`         | (dari Supabase Dashboard)                   |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | (dari Supabase Dashboard)                   |
| `VITE_APP_NAME`                  | `KEKASI`                                    |
| `VITE_RESERVE_TIMEOUT`           | `5`                                         |
| `VITE_APP_URL`                   | (akan diisi setelah deploy)                 |
| `VITE_RESEND_FROM_EMAIL`         | `onboarding@resend.dev`                     |
| `RESEND_API_KEY`                 | (jika menggunakan Resend)                   |

> **💡 Tip**: Anda bisa copy dari file `.env` lokal Anda

### Langkah 5: Deploy!

1. Klik **"Deploy"**
2. Tunggu proses build (biasanya 1-3 menit)
3. Setelah selesai, Anda akan mendapat URL deployment seperti:
   - `https://kekasi-app.vercel.app`
   - atau custom domain Anda

### Langkah 6: Update Environment Variable

Setelah deploy berhasil:

1. Copy URL deployment Anda
2. Kembali ke **Project Settings** → **Environment Variables**
3. Edit `VITE_APP_URL` dengan URL deployment Anda
4. Klik **"Redeploy"** untuk apply perubahan

---

## ⚡ Metode 2: Deploy via Vercel CLI

### Langkah 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Langkah 2: Login ke Vercel

```bash
vercel login
```

Ikuti instruksi untuk login via email atau GitHub.

### Langkah 3: Deploy

Di root folder project, jalankan:

```bash
vercel
```

CLI akan menanyakan beberapa pertanyaan:

```
? Set up and deploy "~/KEKASI-react - Vercel Deployment"? [Y/n] y
? Which scope do you want to deploy to? [pilih account Anda]
? Link to existing project? [N/y] n
? What's your project's name? kekasi-app
? In which directory is your code located? ./
```

Vercel akan otomatis:

- Mendeteksi framework Vite
- Build project
- Deploy ke URL temporary

### Langkah 4: Tambahkan Environment Variables

Anda bisa menambahkan via CLI:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_SERVICE_ROLE_KEY
vercel env add VITE_APP_NAME
vercel env add VITE_RESERVE_TIMEOUT
vercel env add VITE_APP_URL
vercel env add VITE_RESEND_FROM_EMAIL
vercel env add RESEND_API_KEY
```

Atau via dashboard Vercel.

### Langkah 5: Deploy Production

```bash
vercel --prod
```

---

## 🔧 Konfigurasi Supabase

Setelah deploy, Anda perlu update **Redirect URLs** di Supabase:

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Pergi ke **Authentication** → **URL Configuration**
4. Tambahkan URL Vercel Anda ke **Redirect URLs**:
   ```
   https://kekasi-app.vercel.app/**
   ```
5. Tambahkan juga ke **Site URL**:
   ```
   https://kekasi-app.vercel.app
   ```

---

## 🎨 Custom Domain (Opsional)

Jika Anda punya domain sendiri:

1. Buka **Project Settings** → **Domains**
2. Klik **"Add Domain"**
3. Masukkan domain Anda (contoh: `kekasi.com`)
4. Ikuti instruksi untuk update DNS records
5. Tunggu propagasi DNS (5-48 jam)

---

## 🔄 Auto-Deploy

Vercel otomatis akan deploy ulang setiap kali Anda push ke GitHub:

- **Push ke `main` branch** → Deploy ke Production
- **Push ke branch lain** → Deploy Preview

---

## 📊 Monitoring

Setelah deploy, Anda bisa monitor aplikasi di Vercel Dashboard:

- **Analytics**: Lihat traffic dan performance
- **Logs**: Debug errors
- **Deployments**: Lihat history deployment
- **Speed Insights**: Analisis kecepatan loading

---

## 🐛 Troubleshooting

### Build Failed

Jika build gagal, cek:

1. **Logs** di Vercel Dashboard
2. Pastikan semua dependencies ada di `package.json`
3. Test build lokal: `npm run build`

### Environment Variables Tidak Terbaca

- Pastikan nama variable diawali dengan `VITE_`
- Redeploy setelah menambah/edit env variables
- Cek di **Project Settings** → **Environment Variables**

### 404 Error pada Routing

File `vercel.json` sudah dikonfigurasi untuk handle SPA routing. Jika masih error:

1. Pastikan `vercel.json` ada di root project
2. Redeploy project

### Supabase Connection Error

1. Cek environment variables di Vercel
2. Pastikan Supabase URL dan Keys benar
3. Cek Redirect URLs di Supabase Dashboard

---

## ✅ Checklist Deployment

- [ ] Push code ke GitHub
- [ ] Import project ke Vercel
- [ ] Tambahkan environment variables
- [ ] Deploy project
- [ ] Update `VITE_APP_URL` dengan URL deployment
- [ ] Update Redirect URLs di Supabase
- [ ] Test login dan fitur utama
- [ ] (Opsional) Setup custom domain

---

## 📞 Bantuan

Jika ada masalah:

1. Cek [Vercel Documentation](https://vercel.com/docs)
2. Cek [Vercel Community](https://github.com/vercel/vercel/discussions)
3. Lihat logs di Vercel Dashboard

---

## 🎉 Selamat!

Aplikasi KEKASI Anda sekarang sudah live di Vercel! 🚀

**Next Steps:**

- Share URL dengan tim Anda
- Setup custom domain
- Enable analytics
- Monitor performance
