-- 
-- task_attachments
-- 
-- SELECT POLICY
CREATE POLICY "select task_attachments for all role"
ON task_attachments
FOR SELECT
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_attachments.task_id
        AND (
            get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
            OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL) 
            OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division() AND tasks.deleted_at IS NULL)
        )
    )
);
-- INSERT POLICY
CREATE POLICY "insert task_attachments for all role"
ON task_attachments
FOR INSERT
TO authenticated
WITH CHECK(
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_attachments.task_id
        AND (
            (get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN'))
            OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division() AND tasks.deleted_at IS NULL)
            OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
        )
    )
);
-- DELETE POLICY
CREATE POLICY "delete task_attachments for all role except STAFF"
ON task_attachments
FOR DELETE
TO authenticated
USING(
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_attachments.task_id
        AND (
            (get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN'))
            OR (
                get_my_role() = 'TECHNICIAN' 
                AND tasks.division_id = get_my_division() 
                AND task_attachments.uploaded_by_id = auth.uid()::text
                AND tasks.deleted_at IS NULL
                )
        )
    )
);
