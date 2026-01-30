-- Auto Rekap Logs Table
-- Run this SQL in Supabase SQL Editor

-- Create table for logging auto rekap executions
CREATE TABLE IF NOT EXISTS auto_rekap_logs (
  id SERIAL PRIMARY KEY,
  tanggal DATE NOT NULL,
  jenis VARCHAR(20) NOT NULL DEFAULT 'harian',
  filename VARCHAR(255),
  file_path VARCHAR(500),
  total_records INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by date
CREATE INDEX IF NOT EXISTS idx_auto_rekap_logs_tanggal ON auto_rekap_logs(tanggal);
CREATE INDEX IF NOT EXISTS idx_auto_rekap_logs_status ON auto_rekap_logs(status);

-- Enable RLS
ALTER TABLE auto_rekap_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access to auto_rekap_logs"
ON auto_rekap_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Policy: Allow authenticated users to read logs
CREATE POLICY "Authenticated users can read auto_rekap_logs"
ON auto_rekap_logs
FOR SELECT
USING (auth.role() = 'authenticated');

-- Comment on table
COMMENT ON TABLE auto_rekap_logs IS 'Logs for automated daily rekap generation';
