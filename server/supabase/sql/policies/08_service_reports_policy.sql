-- 
-- SERVICE REPORTS
-- 
-- SELECT POLICY
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
CREATE POLICY "insert service_reports for all role except STAFF"
ON service_reports
FOR INSERT
TO AUTHENTICATED
WITH CHECK(
    EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = service_reports.task_id
        AND (
            (get_my_role() IN ('MANAGER_DIVISION', 'SUPER_ADMIN'))
            OR (get_my_role() = 'TECHNICIAN' AND tasks.division_id = get_my_division() AND tasks.deleted_at IS NULL)
        )
    )
);
