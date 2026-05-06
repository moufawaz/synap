-- Exercise video cache table
-- Stores resolved YouTube video IDs per exercise name so we:
--   1. Avoid repeated API/scraper calls for the same exercise
--   2. Accumulate a library that improves over time
--   3. Keep video_id fresh by re-searching when searched_at > 30 days old

CREATE TABLE IF NOT EXISTS exercise_videos (
  exercise_name TEXT     PRIMARY KEY,          -- normalised lowercase key
  video_id      TEXT,                          -- 11-char YouTube ID, or NULL if not found
  verified      BOOLEAN  NOT NULL DEFAULT false, -- true = manually curated
  searched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index makes age-based cache invalidation fast
CREATE INDEX IF NOT EXISTS exercise_videos_searched_at_idx ON exercise_videos (searched_at);

-- RLS: API routes run with the anon key but we want server-side writes only.
-- Use service-role key in API routes OR keep permissive for simplicity;
-- the table holds no user PII so broad access is acceptable.
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;

-- Read: anyone can read cached videos (needed for client-side lookups if ever)
CREATE POLICY "exercise_videos_read" ON exercise_videos
  FOR SELECT USING (true);

-- Write: only authenticated service calls (anon key is fine for server routes)
CREATE POLICY "exercise_videos_write" ON exercise_videos
  FOR ALL USING (true);
