# 🔧 Fix: Fitur Konflik Login Tidak Berfungsi

## 🔍 Root Cause

Fitur deteksi konflik login (prevent multiple login) tidak berfungsi karena kemungkinan **tabel `user_sessions` belum ada** di database Supabase production.

Ketika Anda copy folder, kode sudah ada tapi tabel database mungkin belum dibuat.

---

## ✅ Solusi: Buat Tabel `user_sessions`

### **STEP 1: Buka Supabase SQL Editor**

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri (ikon </> )
4. Klik **"New Query"**

### **STEP 2: Jalankan SQL Berikut**

Copy dan paste SQL ini, lalu klik **"Run"**:

```sql
-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);
```

### **STEP 3: Verifikasi Tabel Sudah Dibuat**

1. Klik **Table Editor** di sidebar kiri
2. Cari tabel **`user_sessions`**
3. Pastikan tabel ada dengan kolom:
   - `id` (UUID)
   - `user_id` (UUID)
   - `session_token` (TEXT)
   - `device_info` (TEXT)
   - `is_active` (BOOLEAN)
   - `created_at` (TIMESTAMPTZ)
   - `last_activity` (TIMESTAMPTZ)

---

## 🧪 Testing Fitur Konflik Login

Setelah tabel dibuat, test fitur konflik:

### **Test 1: Login di 2 Browser Berbeda**

1. **Browser 1** (Chrome): Login dengan akun `dapot`
2. **Browser 2** (Firefox/Edge): Login dengan akun `dapot` yang sama
3. **Expected Result**: Browser 1 akan otomatis logout dengan pesan "Akun Anda telah login di tempat lain"

### **Test 2: Login di 2 Tab Berbeda**

1. **Tab 1**: Login dengan akun `dapot`
2. **Tab 2**: Login dengan akun `dapot` yang sama
3. **Expected Result**: Tab 1 akan otomatis logout

### **Test 3: Cek Console Browser**

Buka Console (F12) dan cari log:

```
[Session] Creating new session for user ...
[Session] Session created: ...
[Session] 🔔 Creating NEW session channel for user: ...
[Session] 🚨 Force logout detected - OUR session was deactivated!
```

---

## 🐛 Troubleshooting

### Tabel Sudah Ada Tapi Masih Tidak Berfungsi

Cek apakah ada error di console browser:

1. Buka aplikasi: `https://aplikasi-kekasi.vercel.app`
2. Login
3. Buka Console (F12)
4. Cari error yang mengandung kata "session" atau "user_sessions"

### Error: "permission denied for table user_sessions"

Jalankan SQL ini untuk fix RLS policies:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON user_sessions;

-- Create new policies yang lebih permissive
CREATE POLICY "Enable all for authenticated users"
  ON user_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Masih Tidak Berfungsi

Cek apakah Realtime enabled untuk tabel `user_sessions`:

1. Buka **Database** → **Replication** di Supabase
2. Cari tabel `user_sessions`
3. Pastikan toggle **Realtime** dalam keadaan **ON** (hijau)
4. Jika OFF, klik untuk enable

---

## ✅ Checklist

- [ ] Buka Supabase SQL Editor
- [ ] Jalankan SQL create table
- [ ] Verifikasi tabel `user_sessions` ada
- [ ] Enable Realtime untuk tabel `user_sessions`
- [ ] Test login di 2 browser berbeda
- [ ] Verifikasi browser pertama auto-logout

---

**Silakan jalankan STEP 1-3 dan test fitur konflik login!** Screenshot jika ada error atau bingung. 😊
