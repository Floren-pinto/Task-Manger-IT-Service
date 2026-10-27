-- add tasks.completed_at for service history
-- run manually in Supabase SQL Editor (do not rely on prisma migrate for remote Supabase)
-- then re-run enforce_task_column_restrictions() from functions/01_trigger_functions.sql
-- safe to re-run
BEGIN;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS tasks_completed_at_idx
  ON tasks (completed_at);

-- the BEFORE UPDATE triggers would override completed_at (derived from status)
-- and bump updated_at, so they are disabled only for this backfill
ALTER TABLE tasks DISABLE TRIGGER USER;

-- backfill: take the latest change to COMPLETED for tasks that are still COMPLETED
UPDATE tasks t
SET completed_at = h.changed_at
FROM (
  SELECT DISTINCT ON (task_id)
    task_id,
    changed_at
  FROM task_status_history
  WHERE new_status = 'COMPLETED'
  ORDER BY task_id, changed_at DESC
) h
WHERE t.id = h.task_id
  AND t.status = 'COMPLETED'
  AND t.completed_at IS NULL;

ALTER TABLE tasks ENABLE TRIGGER USER;

COMMIT;
