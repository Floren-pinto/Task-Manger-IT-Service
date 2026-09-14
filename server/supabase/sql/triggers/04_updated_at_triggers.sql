CREATE TRIGGER set_tasks_updated_at 
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_tasks_updated_at 
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();