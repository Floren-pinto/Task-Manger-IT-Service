-- policy for select 
create policy "select notifications base on role"
on notifications 
for select
to authenticated
using (user_id = auth.uid()::text);

-- Update policy
create policy "update notifications only is_read column"
on notifications
for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text and is_read = true);
-- insert otomatically by triger
