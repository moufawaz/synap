-- Track weekly macro adjustments for Elite users
CREATE TABLE IF NOT EXISTS macro_adjustments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  previous_calories  INTEGER,
  adjusted_calories  INTEGER,
  previous_protein_g INTEGER,
  adjusted_protein_g INTEGER,
  previous_carbs_g   INTEGER,
  adjusted_carbs_g   INTEGER,
  previous_fat_g     INTEGER,
  adjusted_fat_g     INTEGER,
  rationale     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS macro_adjustments_user_week_idx ON macro_adjustments (user_id, week_start);

ALTER TABLE macro_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own macro adjustments"
  ON macro_adjustments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert macro adjustments"
  ON macro_adjustments FOR INSERT
  TO service_role
  WITH CHECK (true);
