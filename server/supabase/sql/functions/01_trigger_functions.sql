-- function to enforce column restrictions for tasks table based on user role
CREATE OR REPLACE FUNCTION enforce_task_column_restrictions()
RETURNS TRIGGER AS $$
DECLARE allowed_columns_technician text[] := ARRAY['status', 'description'];
        allowed_columns_staff text[] := ARRAY['priority', 'due_date'];
BEGIN
    IF get_my_role() IN ('TECHNICIAN')
    AND (
        to_jsonb(OLD.*) - allowed_columns_technician <> to_jsonb(NEW.*) - allowed_columns_technician
    ) THEN
        RAISE EXCEPTION 'TECHNICIAN only update status and description of the task';
    END IF;
    IF get_my_role() IN ('STAFF')
    AND (
        to_jsonb(OLD.*) - allowed_columns_staff <> to_jsonb(NEW.*) - allowed_columns_staff
    ) THEN
        RAISE EXCEPTION 'STAFF only update priority and due_date of the task';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- function to automatically insert a notification when a task is assigned
CREATE OR REPLACE FUNCTION insert_notification_on_task_assignment()
RETURNS TRIGGER AS $$
DECLARE new_task_title TEXT;
BEGIN
    SELECT title INTO new_task_title FROM tasks WHERE id = NEW.task_id;
    INSERT INTO notifications (id, user_id, title, message, type,  created_at, related_task_id, is_read)
    VALUES (
        gen_random_uuid(),
        NEW.user_id, 
        'new task assigned', 
        CONCAT('You have been assigned a new task: "', new_task_title, '"'),
        'ASSIGNMENT', 
        now(),
        NEW.task_id,
        FALSE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- function to automatically insert a notification when a task is STATUS_CHANGED
CREATE OR REPLACE FUNCTION insert_notification_on_task_status_change()
RETURNS TRIGGER AS $$
DECLARE 
    v_task_title TEXT;
BEGIN
    SELECT title INTO v_task_title FROM tasks WHERE id = NEW.task_id;

    INSERT INTO notifications (
        user_id, title, message, type, related_task_id, is_read, created_at
    )
    SELECT
        combined.user_id,
        'task status changed',
        CONCAT('The status of task "', v_task_title, '" has been changed from "', NEW.old_status, '" to "', NEW.new_status, '"'),
        'STATUS_CHANGE',
        NEW.task_id,
        FALSE,
        now()
    FROM (
        SELECT user_id FROM task_assignments WHERE task_id = NEW.task_id
        UNION
        SELECT id FROM users WHERE role = 'MANAGER_DIVISION' AND division_id = (SELECT division_id FROM tasks WHERE id = NEW.task_id)
        UNION
        SELECT NEW.user_id
    ) AS combined;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- function to denied user to update sensetife columns in users table
CREATE OR REPLACE FUNCTION enforce_user_column_restrictions()
RETURNS TRIGGER AS $$
DECLARE
    allowed_columns_self    text[] := ARRAY['name', 'email'];
    allowed_columns_manager text[] := ARRAY['is_active'];
BEGIN
    IF get_my_role() = 'SUPER_ADMIN' THEN
        RETURN NEW;
    END IF;

    IF OLD.id = auth.uid()::text THEN
        IF to_jsonb(OLD.*) - allowed_columns_self <> to_jsonb(NEW.*) - allowed_columns_self THEN
            RAISE EXCEPTION 'You are only allowed to update your own name and email';
        END IF;
        RETURN NEW;
    END IF;

    IF get_my_role() = 'MANAGER_DIVISION' AND OLD.division_id = get_my_division() THEN
        IF to_jsonb(OLD.*) - allowed_columns_manager <> to_jsonb(NEW.*) - allowed_columns_manager THEN
            RAISE EXCEPTION 'MANAGER_DIVISION may only update is_active for users in their division';
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'You are not allowed to update this user';
END;
$$ LANGUAGE plpgsql;
