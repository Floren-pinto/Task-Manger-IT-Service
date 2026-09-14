CREATE OR REPLACE FUNCTION update_task_status(p_task_id text, p_new_status "TaskStatus")
RETURNS VOID AS $$
DECLARE
    v_old_status "TaskStatus";
BEGIN
    SELECT status INTO v_old_status FROM tasks WHERE id = p_task_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TASK_NOT_FOUND';
    END IF;

    IF v_old_status = p_new_status THEN
        RAISE EXCEPTION 'SAME_STATUS';
    END IF;

    UPDATE tasks SET status = p_new_status WHERE id = p_task_id;

    INSERT INTO task_status_history(id, task_id, user_id, old_status, new_status)
    VALUES (gen_random_uuid(), p_task_id, auth.uid()::text, v_old_status, p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;