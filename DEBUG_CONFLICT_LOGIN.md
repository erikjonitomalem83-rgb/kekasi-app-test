# 🔧 Debug: Fitur Konflik Login Tidak Auto-Logout

Mari kita cek satu per satu kenapa Tab 1 tidak auto-logout.

---

## 📋 STEP 1: Cek Console Browser

### **Tab 1 (Login Pertama)**

1. Buka `https://aplikasi-kekasi.vercel.app`
2. **Buka Console** (tekan F12 → tab Console)
3. Login dengan akun `dapot`
4. **Cari log** di console yang mengandung kata:
   - `[Session] Creating new session`
   - `[Session] Session created:`
   - `[sessionService] 🔔 Creating NEW session channel`

**Screenshot console Tab 1 dan kirim ke saya!**

### **Tab 2 (Login Kedua)**

1. Buka **tab baru** (jangan tutup Tab 1)
2. Buka `https://aplikasi-kekasi.vercel.app`
3. **Buka Console** (F12)
4. Login dengan akun `dapot` yang sama
5. **Cari log** di console

### **Kembali ke Tab 1**

1. Lihat console Tab 1
2. **Cari log** yang mengandung:
   - `[Session] 📡 Change detected:`
   - `[Session] 🚨 Force logout detected`
   - Atau **error** apa saja yang berwarna merah

**Screenshot console Tab 1 setelah login di Tab 2!**

---

## 📋 STEP 2: Cek Tabel user_sessions di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik **Table Editor** (sidebar kiri)
4. **Cari tabel `user_sessions`**

### **Jika Tabel TIDAK ADA:**

Jalankan SQL ini di **SQL Editor**:

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (permissive untuk testing)
CREATE POLICY "Enable all for authenticated users"
  ON user_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
```

### **Jika Tabel SUDAH ADA:**

1. Klik tabel `user_sessions`
2. **Screenshot isi tabel** (berapa baris data ada?)
3. Cek apakah ada data dengan `user_id` yang sama tapi `session_token` berbeda

---

## 📋 STEP 3: Cek Realtime di Supabase

1. Di Supabase Dashboard, klik **Database** → **Replication**
2. Cari tabel **`user_sessions`**
3. **Cek apakah toggle Realtime dalam keadaan ON (hijau)**

### **Jika OFF (abu-abu):**

1. Klik toggle untuk **enable Realtime**
2. Tunggu beberapa detik
3. **Test ulang** konflik login

---

## 📋 STEP 4: Cek localStorage

### **Di Tab 1 (setelah login):**

1. Buka Console (F12)
2. Ketik command ini dan tekan Enter:
   ```javascript
   localStorage.getItem("kekasi_session_token");
   ```
3. **Screenshot hasilnya** (harus ada string panjang seperti `1732857234567-abc123def456`)

### **Jika NULL atau undefined:**

Berarti session tidak dibuat. Ada error di `createSession`.

---

## 📋 STEP 5: Manual Test Realtime

Untuk test apakah Realtime berfungsi, jalankan ini di Console Tab 1:

```javascript
// Test Realtime subscription
const { createClient } = supabase;
const testChannel = supabase
  .channel("test-channel")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "user_sessions",
    },
    (payload) => {
      console.log("🔔 REALTIME WORKING:", payload);
    }
  )
  .subscribe((status) => {
    console.log("Subscription status:", status);
  });
```

Kemudian di Tab 2, login lagi. Jika Realtime berfungsi, Tab 1 akan muncul log `🔔 REALTIME WORKING:`.

---

## 🐛 Kemungkinan Masalah:

### **1. Tabel user_sessions Tidak Ada**

→ Jalankan SQL di STEP 2

### **2. Realtime Tidak Enabled**

→ Enable di Database → Replication

### **3. RLS Policy Terlalu Ketat**

→ Ganti dengan policy permissive di STEP 2

### **4. Session Token Tidak Tersimpan**

→ Ada error di createSession, cek console

### **5. Subscription Tidak Terbuat**

→ Ada error di subscribeToSessionChanges, cek console

---

## ✅ Checklist Debug:

- [ ] Screenshot console Tab 1 saat login
- [ ] Screenshot console Tab 1 setelah login di Tab 2
- [ ] Cek tabel user_sessions ada atau tidak
- [ ] Cek Realtime enabled atau tidak
- [ ] Cek localStorage ada session_token atau tidak
- [ ] Test manual Realtime dengan script di STEP 5

---

**Tolong lakukan STEP 1-5 dan kirim screenshot console + hasil pengecekan!** Dari situ saya bisa tahu persis masalahnya di mana. 😊
