-- SELECT POLICY
-- STAFF/TECHNICIAN hanya melihat asset aktif; SUPER_ADMIN/MANAGER_DIVISION
-- boleh melihat asset yang sudah di-soft delete.
DROP POLICY IF EXISTS "select assets able for all role" ON assets;
CREATE POLICY "select assets per role and deleted state"
ON assets
FOR SELECT
TO AUTHENTICATED
USING (
    deleted_at IS NULL
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
);
-- INSERT POLICY
DROP POLICY IF EXISTS "insert assets for all role" ON assets;
CREATE POLICY "insert assets for all role"
ON assets
FOR INSERT
TO AUTHENTICATED
WITH CHECK (TRUE);
-- UPDATE POLICY AND SOFT DELETE POLICY (deletedAt)
DROP POLICY IF EXISTS "update assets and soft delete for all role" ON assets;
CREATE POLICY "update assets and soft delete for all role"
ON assets
FOR UPDATE
TO AUTHENTICATED
USING(true)
WITH CHECK (true);
