-- SELECT POLICY
CREATE POLICY "select assets able for all role"
ON assets
FOR SELECT
TO AUTHENTICATED
USING (TRUE);   
-- INSERT POLICY    
CREATE POLICY "insert assets for all role"
ON assets
FOR INSERT
TO AUTHENTICATED
WITH CHECK (TRUE);
-- UPDATE POLICY AND SOFT DELETE POLICY (deletedAt)
CREATE POLICY "update assets and soft delete for all role"
ON assets
FOR UPDATE
TO AUTHENTICATED
USING(true)
WITH CHECK (true);
