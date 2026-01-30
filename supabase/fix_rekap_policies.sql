-- 1. Bersihkan policy lama (agar tidak konflik)
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.auto_rekap_logs;
DROP POLICY IF EXISTS "Allow listing rekap files" ON storage.objects;
DROP POLICY IF EXISTS "Public read rekap logs" ON public.auto_rekap_logs;
DROP POLICY IF EXISTS "Public read rekap files" ON storage.objects;

-- 2. Buka akses baca ke tabel rekap (untuk semua user login & publik)
CREATE POLICY "Public read rekap logs" 
ON public.auto_rekap_logs 
FOR SELECT 
USING (true);

-- 3. Buka akses baca & hapus ke bucket rekap-files (untuk semua user login & publik)
CREATE POLICY "Public read and delete rekap files" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'rekap-files');

-- Pastikan RLS aktif
ALTER TABLE public.auto_rekap_logs ENABLE ROW LEVEL SECURITY;
