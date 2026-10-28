-- SELECT POLICY
-- STAFF/TECHNICIAN hanya melihat asset aktif; SUPER_ADMIN/MANAGER_DIVISION
-- boleh melihat asset yang sudah di-soft delete.
DROP POLICY IF EXISTS "select assets able for all role" ON assets;
DROP POLICY IF EXISTS "select assets per role and deleted state" ON assets;
CREATE POLICY "select assets per role and deleted state"
ON assets
FOR SELECT
TO AUTHENTICATED
USING (
    deleted_at IS NULL
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
);

-- Hak tulis mengikuti tabel clients: TECHNICIAN hanya membaca, STAFF boleh
-- membuat/mengubah asset aktif tetapi tidak boleh mengarsip/memulihkan.

-- INSERT POLICY
DROP POLICY IF EXISTS "insert assets for all role" ON assets;
DROP POLICY IF EXISTS "insert assets for all except technician" ON assets;
CREATE POLICY "insert assets for all except technician"
ON assets
FOR INSERT
TO AUTHENTICATED
WITH CHECK (get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION', 'STAFF'));

-- UPDATE POLICY AND SOFT DELETE POLICY (deletedAt)
DROP POLICY IF EXISTS "update assets and soft delete for all role" ON assets;
DROP POLICY IF EXISTS "update assets for all except technician" ON assets;
CREATE POLICY "update assets for all except technician"
ON assets
FOR UPDATE
TO AUTHENTICATED
USING (
    (deleted_at IS NULL AND get_my_role() = 'STAFF')
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
)
WITH CHECK (
    (deleted_at IS NULL AND get_my_role() = 'STAFF')
    OR get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
);
