-- trigger to enforce column restrictions for tasks table based on user role
CREATE TRIGGER enforce_task_column_restrictions
BEFORE UPDATE ON tasks
FOR EACH ROW 
EXECUTE FUNCTION enforce_task_column_restrictions();
