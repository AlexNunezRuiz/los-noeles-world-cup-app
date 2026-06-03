-- ============================================================
-- 006 - Bank transfer payment configuration
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_reference TEXT;

INSERT INTO tournament_config (key, value) VALUES
  ('payment_amount', '5'),
  ('payment_method', 'transfer'),
  ('bank_account_holder', ''),
  ('bank_iban', ''),
  ('bank_concept_prefix', 'PORRA')
ON CONFLICT (key) DO NOTHING;
