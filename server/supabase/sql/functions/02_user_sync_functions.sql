CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO users (id, name, email, role, is_active, division_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.user_metadata->>'name', split_part(NEW.email, '@', 1)),
    NEW.email, 
    'TECHNICIAN', 
    true, 
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
