--------------------
-- FUNCTION
--------------------
-- function to get the role of the current user
create or replace FUNCTION get_my_role()
returns text as $$
select role::text from users where id = auth.uid()::text;
$$ language sql stable SECURITY DEFINER;

-- function to get the division_id from current user
create or replace FUNCTION get_my_division()
returns text as $$
select division_id from users where id = auth.uid()::text;
$$ language sql stable SECURITY DEFINER;