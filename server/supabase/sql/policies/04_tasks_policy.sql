-- 
-- Tasks
-- 
-- Sellect policy
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
CREATE POLICY "insert for all role except technician"
ON tasks
FOR INSERT
TO AUTHENTICATED
WITH CHECK (get_my_role() != 'TECHNICIAN');
-- UPDATE POLICY AND SOFT DELETE POLICY (deletedAt) using trigger
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
    (deleted_at IS NULL AND get_my_role() != 'TECHNICIAN')
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
);
