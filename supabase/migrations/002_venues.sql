-- ============================================================
-- 002 - Sedes (venues)
-- ============================================================

CREATE TABLE venues (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE matches ADD COLUMN venue_id INTEGER REFERENCES venues(id);
ALTER TABLE matches DROP COLUMN venue;

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues are viewable by everyone" ON venues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage venues" ON venues
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
