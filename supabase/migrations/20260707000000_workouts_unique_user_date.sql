-- Prevent two workouts existing for the same user on the same date.
-- Chat's log_workout has a check-then-insert race window between concurrent
-- calls; a DB constraint is the only reliable fix. Client code catches
-- error code 23505 and retries by fetching the winning row.

-- If duplicates already exist (from previous races), fold entries into the
-- earliest workout and drop the rest before adding the constraint.
WITH ranked AS (
  SELECT
    id,
    user_id,
    date,
    ROW_NUMBER() OVER (PARTITION BY user_id, date ORDER BY created_at NULLS LAST, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY user_id, date ORDER BY created_at NULLS LAST, id) AS keeper
  FROM workouts
),
dupes AS (
  SELECT id, keeper FROM ranked WHERE rn > 1
)
UPDATE workout_entries
SET workout_id = dupes.keeper
FROM dupes
WHERE workout_entries.workout_id = dupes.id;

DELETE FROM workouts
USING (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, date ORDER BY created_at NULLS LAST, id) AS rn
    FROM workouts
  ) r
  WHERE r.rn > 1
) d
WHERE workouts.id = d.id;

ALTER TABLE workouts
  ADD CONSTRAINT workouts_user_id_date_key UNIQUE (user_id, date);
