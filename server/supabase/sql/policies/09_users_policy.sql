-- 
-- users
-- 
-- SELECT POLICY
CREATE POLICY "select"
ON users
FOR SELECT
TO authenticated
USING (
    get_my_role() = 'SUPER_ADMIN'
    OR (
    role != 'SUPER_ADMIN'
    AND deleted_at IS NULL
    AND (
        (get_my_role()='TECHNICIAN' and id = auth.uid()::text)
        OR get_my_role() = 'MANAGER_DIVISION'
        OR (get_my_role() = 'STAFF' and (id = auth.uid()::text OR role = 'TECHNICIAN' ))
    )
)
);

-- UPDATE POLICY
DROP POLICY IF EXISTS "update only own profile and super admin can update all" ON users;

CREATE POLICY "update own profile, manager update division staff, super admin all"
ON users
FOR UPDATE
TO authenticated
USING (
    get_my_role() = 'SUPER_ADMIN'
    OR (id = auth.uid()::text AND deleted_at IS NULL)
    OR (
        get_my_role() = 'MANAGER_DIVISION'
        AND division_id = get_my_division()
        AND deleted_at IS NULL
        AND role != 'SUPER_ADMIN' 
    )
)
WITH CHECK (
    get_my_role() = 'SUPER_ADMIN'
    OR (id = auth.uid()::text AND deleted_at IS NULL)
    OR (
        get_my_role() = 'MANAGER_DIVISION'
        AND division_id = get_my_division()
        AND deleted_at IS NULL
        AND role != 'SUPER_ADMIN'
    )
);