-- New auth accounts start INACTIVE. POST /api/users (SUPER_ADMIN) activates the
-- profile right after creating the account, so a self sign-up through the public
-- anon key never gets data access.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, role, is_active, division_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        'TECHNICIAN',
        FALSE,
        NULL            
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;