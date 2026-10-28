--
-- task_status_history
-- safe to re-run
--
-- SELECT POLICY
DROP POLICY IF EXISTS "select task_status_history for all role" ON task_status_history;
CREATE POLICY "select task_status_history for all role"
ON task_status_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_status_history.task_id
        AND (
            get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
            OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
            OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division() AND tasks.deleted_at IS NULL)
        )
    )
);

-- NO INSERT POLICY
-- History rows are written only by update_task_status() (SECURITY DEFINER),
-- which always records auth.uid() as the actor. Without an INSERT policy a
-- user cannot write a fake history row directly.
DROP POLICY IF EXISTS "insert task_status_history for all role except STAF" ON task_status_history;
