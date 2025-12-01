# 🔍 Langkah 1: Cek Tabel user_sessions di Supabase

**PENTING: Jangan edit code dulu! Kita cek database dulu.**

---

## 📋 STEP 1: Buka Supabase Dashboard

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Login jika belum
3. Pilih project **Kanim Siantar**

---

## 📋 STEP 2: Cek Apakah Tabel user_sessions Ada

1. Klik **Table Editor** di sidebar kiri (ikon tabel)
2. **Scroll** atau **search** tabel dengan nama **`user_sessions`**

### **Jika Tabel TIDAK ADA:**

Berarti kita perlu buat tabel baru. Lanjut ke STEP 3.

### **Jika Tabel SUDAH ADA:**

1. Klik tabel `user_sessions`
2. **Screenshot** struktur tabel (kolom-kolomnya)
3. Cek apakah ada kolom:
   - `id` (UUID)
   - `user_id` (UUID)
   - `session_token` (TEXT)
   - `device_info` (TEXT)
   - `is_active` (BOOLEAN)
   - `created_at` (TIMESTAMPTZ)
   - `last_activity` (TIMESTAMPTZ)

---

## 📋 STEP 3: Jika Tabel Tidak Ada, Buat Tabel Baru

1. Klik **SQL Editor** di sidebar kiri (ikon </> )
2. Klik **"New Query"**
3. Copy-paste SQL berikut:

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

-- Create RLS policies (permissive untuk testing)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON user_sessions;
CREATE POLICY "Enable all for authenticated users"
  ON user_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. Klik **"Run"** (atau Ctrl+Enter)
5. **Screenshot** hasil eksekusi (harus sukses, tidak ada error)

---

## 📋 STEP 4: Enable Realtime untuk Tabel user_sessions

1. Klik **Database** → **Replication** di sidebar kiri
2. **Scroll** atau **search** tabel **`user_sessions`**
3. Pastikan toggle **Realtime** dalam keadaan **ON (hijau)**
4. Jika OFF, klik toggle untuk enable
5. **Screenshot** status Realtime

---

## ✅ Checklist:

- [ ] Buka Supabase Dashboard
- [ ] Cek apakah tabel `user_sessions` ada
- [ ] Jika tidak ada: Jalankan SQL create table
- [ ] Enable Realtime untuk tabel `user_sessions`
- [ ] Screenshot hasil

---

**Tolong lakukan STEP 1-4 dan screenshot hasilnya!** Setelah ini baru kita test session conflict. 😊
