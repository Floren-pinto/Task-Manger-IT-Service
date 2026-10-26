-- enable supabase realtime (postgres changes) for notifications
-- run manually in Supabase SQL Editor; safe to re-run
-- RLS "select notifications base on role" still limits events to the owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
