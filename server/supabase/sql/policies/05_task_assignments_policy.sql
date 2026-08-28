-- 
-- task_assignments
-- 
-- SELECT POLICY
CREATE POLICY "select task_assignments for all role"
ON task_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_assignments.task_id
        AND (
            get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
            OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
            OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division() AND tasks.deleted_at IS NULL)
        )
    )
);
-- INSERT POLICY
CREATE POLICY "insert task_assignments for all role except technician"
ON task_assignments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_assignments.task_id
        AND (
            (get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN'))
            OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
        )
    )
);
-- UPDATE POLICY
CREATE POLICY "update task_assignments with some exception"
ON task_assignments
FOR UPDATE
TO AUTHENTICATED
USING (
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_assignments.task_id
        AND (
            (get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN'))
            OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_assignments.task_id
        AND (
            (get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN'))
            OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
        )
    )
);
-- DELETE POLICY
CREATE POLICY "delete task_assignments for all role except technician"
ON task_assignments
FOR DELETE
TO AUTHENTICATED
USING(
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_assignments.task_id
        AND (
            (get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN'))
            OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
        )
    )
);
