-- safe to re-run
-- Every rule starts from an active profile (get_my_role() is NULL for
-- inactive/archived accounts and self sign-ups), so they see no clients.

-- SELECT POLICY (updatedAt)
DROP POLICY IF EXISTS "select clients able for all role" ON clients;
CREATE POLICY "select clients able for all role"
ON clients
FOR SELECT
TO AUTHENTICATED
USING (
    get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
    OR (deleted_at IS NULL AND get_my_role() IN ('STAFF', 'TECHNICIAN'))
);
-- INSERT POLICY
DROP POLICY IF EXISTS "insert clients for all except technician" ON clients;
CREATE POLICY "insert clients for all except technician"
ON clients
FOR INSERT
TO AUTHENTICATED
WITH CHECK (get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION', 'STAFF'));
-- UPDATE POLICY AND SOFT DELETE POLICY (deletedAt)
DROP POLICY IF EXISTS "update clients for all except technician" ON clients;
CREATE POLICY "update clients for all except technician"
ON clients
FOR UPDATE
TO AUTHENTICATED
USING (
    (deleted_at IS NULL AND get_my_role() = 'STAFF')
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
)
WITH CHECK(
    (deleted_at IS NULL AND get_my_role() = 'STAFF')
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
);
