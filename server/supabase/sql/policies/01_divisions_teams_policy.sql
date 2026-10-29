-- safe to re-run
-- Read access requires an active profile (get_my_role() is NULL for
-- inactive/archived accounts and self sign-ups).
--
-- Division
--
-- select policy
DROP POLICY IF EXISTS "select divisions able for all role" ON divisions;
CREATE POLICY "select divisions able for all role"
ON divisions
FOR SELECT
TO authenticated
USING (get_my_role() IS NOT NULL);
-- for all to super_admin
DROP POLICY IF EXISTS "all action divisions only for super admin" ON divisions;
CREATE POLICY "all action divisions only for super admin"
ON divisions
FOR ALL
TO authenticated
USING (get_my_role() = 'SUPER_ADMIN')
WITH CHECK (get_my_role() = 'SUPER_ADMIN');
--
-- Teams
--
-- select policy
DROP POLICY IF EXISTS "select teams able for all role" ON teams;
CREATE POLICY "select teams able for all role"
ON teams
FOR SELECT
TO authenticated
USING (get_my_role() IS NOT NULL);
-- for all to super_admin
DROP POLICY IF EXISTS "all action teams only for super admin" ON teams;
CREATE POLICY "all action teams only for super admin"
ON teams
FOR ALL
TO authenticated
USING (get_my_role() = 'SUPER_ADMIN')
WITH CHECK (get_my_role() = 'SUPER_ADMIN');
