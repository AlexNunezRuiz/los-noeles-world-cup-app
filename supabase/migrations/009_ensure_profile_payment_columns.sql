-- 009 - Ensure profile payment columns exist in deployed databases

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_validated_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_note TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_reference TEXT;

NOTIFY pgrst, 'reload schema';

