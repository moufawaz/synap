CREATE TABLE IF NOT EXISTS hydration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  glasses integer NOT NULL DEFAULT 0,
  liters numeric,
  target_liters numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE hydration_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own hydration logs" ON hydration_log;
CREATE POLICY "Users can manage own hydration logs"
ON hydration_log
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
