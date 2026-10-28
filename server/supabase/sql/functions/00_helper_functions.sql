--------------------
-- FUNCTION
--------------------
-- function to get the role of the current user
-- returns NULL for inactive or archived users, so every policy that compares
-- get_my_role() denies access for them (they still hold a valid JWT)
create or replace FUNCTION get_my_role()
returns text as $$
select role::text from users
where id = auth.uid()::text and is_active and deleted_at is null;
$$ language sql stable SECURITY DEFINER SET search_path = public;

-- function to get the division_id from current user (NULL when inactive/archived)
create or replace FUNCTION get_my_division()
returns text as $$
select division_id from users
where id = auth.uid()::text and is_active and deleted_at is null;
$$ language sql stable SECURITY DEFINER SET search_path = public;
