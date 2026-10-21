-- SELECT
CREATE POLICY "select task_attachments files by role"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task_attachments'
  AND EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = (storage.foldername(name))[1]
    AND (
      get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
      OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
      OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division() AND tasks.deleted_at IS NULL)
    )
  )
);

-- INSERT
CREATE POLICY "insert task_attachments files by role"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task_attachments'
  AND EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = (storage.foldername(name))[1]
    AND (
      get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN')
      OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division() AND tasks.deleted_at IS NULL)
      OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
    )
  )
);

-- DELETE
CREATE POLICY "delete task_attachments files by role"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task_attachments'
  AND EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = (storage.foldername(name))[1]
    AND (
      get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN')
      OR (
        get_my_role() = 'TECHNICIAN'
        AND tasks.division_id = get_my_division()
        AND owner = auth.uid()
        AND tasks.deleted_at IS NULL
      )
    )
  )
);