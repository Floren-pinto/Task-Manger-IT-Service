-- SELECT POLICY (updatedAt)
CREATE POLICY "select clients able for all role"
ON clients
FOR SELECT
TO AUTHENTICATED
USING (
    deleted_at IS NULL OR get_my_role() = 'SUPER_ADMIN' OR get_my_role() = 'MANAGER_DIVISION'
);
-- INSERT POLICY
CREATE POLICY "insert clients for all except technician"
ON clients
FOR INSERT
TO AUTHENTICATED
WITH CHECK (get_my_role() != 'TECHNICIAN');
-- UPDATE POLICY AND SOFT DELETE POLICY (deletedAt)
CREATE POLICY "update clients for all except technician"
ON clients
FOR UPDATE
TO AUTHENTICATED
USING (
    (deleted_at IS NULL AND get_my_role() != 'TECHNICIAN')
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
)
WITH CHECK(
    (deleted_at IS NULL AND get_my_role() != 'TECHNICIAN')
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
);
