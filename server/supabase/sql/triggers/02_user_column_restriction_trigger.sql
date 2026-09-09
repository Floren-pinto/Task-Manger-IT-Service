CREATE TRIGGER enforce_user_column_restrictions
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION enforce_user_column_restrictions();