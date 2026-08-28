-- 
-- Division
-- 
-- select policy
create policy "select divisions able for all role"
on divisions
for select
to authenticated
using (true);
-- for all to super_admin
create policy "all action divisions only for super admin"
on divisions
for all
to authenticated
using (get_my_role() = 'SUPER_ADMIN')
with check (get_my_role() = 'SUPER_ADMIN');

-- 
-- Teams
-- 
-- select policy
create policy "select teams able for all role"
on teams
for select
to authenticated
using (true);
-- for all to super_admin
create policy "all action teams only for super admin"
on teams
for all
to authenticated
using (get_my_role() = 'SUPER_ADMIN')
with check (get_my_role() = 'SUPER_ADMIN');
