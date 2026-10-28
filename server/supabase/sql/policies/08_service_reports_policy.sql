--
-- SERVICE REPORTS
-- safe to re-run
--
-- SELECT POLICY
DROP POLICY IF EXISTS "select service_reports for all role" ON service_reports;
CREATE POLICY "select service_reports for all role"
ON service_reports
FOR SELECT
TO AUTHENTICATED
USING (
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = service_reports.task_id
        AND (
            get_my_role() IN ('SUPER_ADMIN', 'MANAGER_DIVISION')
            OR (get_my_role() = 'STAFF' AND tasks.deleted_at IS NULL)
            OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division() AND tasks.deleted_at IS NULL)
        )
    )
);

-- INSERT POLICY
-- created_by_id must be the caller, and reports only exist for active
-- COMPLETED tasks (the same rules POST /api/tasks/:taskId/reports enforces)
DROP POLICY IF EXISTS "insert service_reports for all role except STAFF" ON service_reports;
CREATE POLICY "insert service_reports for all role except STAFF"
ON service_reports
FOR INSERT
TO AUTHENTICATED
WITH CHECK(
    created_by_id = auth.uid()::text
    AND EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = service_reports.task_id
        AND tasks.status = 'COMPLETED'
        AND tasks.deleted_at IS NULL
        AND (
            (get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN'))
            OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division())
        )
    )
);
