-- Lets a user's requested training split (e.g. "Arnold split", "PPL") survive
-- from a chat conversation with Ion into the next plan generation/renewal.
-- Previously nothing persisted that preference: calculateWorkoutParams()
-- always recomputed the split algorithmically from training_days + goal, so
-- a split change Ion "agreed to" in chat had no way to actually reach the
-- generator and got silently discarded on the next Renew.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_split TEXT;  -- free-text label, e.g. "Arnold split"
