-- policy for select 
create policy "select notifications base on role"
on notifications 
for select
to authenticated
using (user_id = auth.uid());

-- Update policy
create policy "update notifications only is_read column"
on notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and is_read = true);
-- insert otomatically by triger
