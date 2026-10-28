-- keep updated_at current on every UPDATE made through Supabase
-- (Prisma's @updatedAt only applies to writes made through Prisma)
-- safe to re-run

DROP TRIGGER IF EXISTS set_tasks_updated_at ON tasks;
CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- old trigger on users was misnamed set_tasks_updated_at
DROP TRIGGER IF EXISTS set_tasks_updated_at ON users;
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_clients_updated_at ON clients;
CREATE TRIGGER set_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_assets_updated_at ON assets;
CREATE TRIGGER set_assets_updated_at
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_divisions_updated_at ON divisions;
CREATE TRIGGER set_divisions_updated_at
BEFORE UPDATE ON divisions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_teams_updated_at ON teams;
CREATE TRIGGER set_teams_updated_at
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
