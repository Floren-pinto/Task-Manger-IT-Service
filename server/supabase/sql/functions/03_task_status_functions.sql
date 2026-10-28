-- The only way to change a task's status, so the history row and the
-- STATUS_CHANGE notification are always written.
-- SECURITY DEFINER: task_status_history has no INSERT policy for users, so
-- this function writes it with the owner's rights and checks access itself
-- (same rules as the tasks RLS policies).
-- Error codes are mapped by PATCH /api/tasks/:taskId/status:
--   42501 not allowed · P0002 task not found · 22023 same status
CREATE OR REPLACE FUNCTION update_task_status(p_task_id text, p_new_status "TaskStatus")
RETURNS VOID AS $$
DECLARE
    v_role text := get_my_role();
    v_task record;
BEGIN
    IF v_role IS NULL OR v_role NOT IN ('SUPER_ADMIN', 'MANAGER_DIVISION', 'TECHNICIAN') THEN
        RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = '42501';
    END IF;

    SELECT status, division_id, deleted_at INTO v_task
    FROM tasks
    WHERE id = p_task_id
    FOR UPDATE;

    -- TECHNICIAN only sees active tasks of their own division (as in RLS);
    -- other tasks are reported as not found so their existence does not leak.
    IF NOT FOUND OR (
        v_role = 'TECHNICIAN'
        AND (
            v_task.division_id IS DISTINCT FROM get_my_division()
            OR v_task.deleted_at IS NOT NULL
        )
    ) THEN
        RAISE EXCEPTION 'TASK_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    IF v_task.status = p_new_status THEN
        RAISE EXCEPTION 'SAME_STATUS' USING ERRCODE = '22023';
    END IF;

    -- tells enforce_task_column_restrictions this status change is legitimate
    PERFORM set_config('app.status_change_via_rpc', 'on', true);

    UPDATE tasks SET status = p_new_status WHERE id = p_task_id;

    INSERT INTO task_status_history(id, task_id, user_id, old_status, new_status)
    VALUES (gen_random_uuid(), p_task_id, auth.uid()::text, v_task.status, p_new_status);

    PERFORM set_config('app.status_change_via_rpc', 'off', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION update_task_status(text, "TaskStatus") FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_task_status(text, "TaskStatus") TO authenticated;
