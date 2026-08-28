-- 
-- task_status_history
-- 
-- SELECT POLICY
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
-- INSERT POLICY
CREATE POLICY "insert task_status_history for all role except STAF"
ON task_status_history
FOR INSERT
TO authenticated
WITH CHECK(
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_status_history.task_id
        AND (
            (get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN'))
            OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division() AND tasks.deleted_at IS NULL)
        )
    )
);
