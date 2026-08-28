-- triger to automatically insert a notification when a task is assigned
CREATE TRIGGER insert_notification_on_task_assignment
AFTER INSERT ON task_assignments
FOR EACH ROW
EXECUTE FUNCTION insert_notification_on_task_assignment();

-- triger to automatically insert a notification when a task status is changed
CREATE TRIGGER insert_notification_on_task_status_change
AFTER INSERT ON task_status_history
FOR EACH ROW
EXECUTE FUNCTION insert_notification_on_task_status_change();
