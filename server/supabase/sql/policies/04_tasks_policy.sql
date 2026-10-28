--
-- Tasks
-- safe to re-run
--
-- Sellect policy
DROP POLICY IF EXISTS "select for all exception to technician select only on his devision" ON tasks;
CREATE POLICY "select for all exception to technician select only on his devision"
ON tasks
FOR SELECT
TO AUTHENTICATED
USING(
    get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
    OR (get_my_role() = 'STAFF' AND deleted_at IS NULL)
    OR (get_my_role() = 'TECHNICIAN' AND division_id = get_my_division() AND deleted_at IS NULL)
);

-- INSERT POLICY
-- created_by_id must be the caller, so the creator cannot be spoofed
DROP POLICY IF EXISTS "insert for all role except technician" ON tasks;
CREATE POLICY "insert for all role except technician"
ON tasks
FOR INSERT
TO AUTHENTICATED
WITH CHECK (
    get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION', 'STAFF')
    AND created_by_id = auth.uid()::text
);

-- UPDATE POLICY AND SOFT DELETE POLICY (deletedAt) using trigger
-- status changes are further limited to update_task_status() by the trigger
DROP POLICY IF EXISTS "update tasks for SUPER, MANAGER and other with some exception" ON tasks;
CREATE POLICY "update tasks for SUPER, MANAGER and other with some exception"
ON tasks
FOR UPDATE
TO AUTHENTICATED
USING(
    get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
    OR (get_my_role() = 'STAFF' AND deleted_at IS NULL)
    OR (get_my_role() = 'TECHNICIAN' AND division_id = get_my_division() AND deleted_at IS NULL)
)
WITH CHECK(
    (deleted_at IS NULL AND get_my_role() IN ('STAFF', 'TECHNICIAN'))
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
);
