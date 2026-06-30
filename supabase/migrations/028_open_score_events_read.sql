-- 028 - Open score_events reads to all authenticated users.
--
-- score_events only contains points for matches/awards that have ALREADY been
-- resolved, so exposing it does not leak anyone's pending predictions. Making it
-- readable by everyone lets each participant audit not just their own points but
-- also everyone else's, so there are no doubts about the ranking.

DROP POLICY IF EXISTS "Users can view own score events" ON score_events;
DROP POLICY IF EXISTS "Score events viewable by authenticated" ON score_events;

CREATE POLICY "Score events viewable by authenticated" ON score_events
  FOR SELECT TO authenticated USING (true);

-- The admin-only "Only system can manage score events" (ALL) policy stays as is.

NOTIFY pgrst, 'reload schema';
