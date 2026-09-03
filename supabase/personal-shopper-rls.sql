alter table public.shopper_conversations enable row level security;
alter table public.shopper_messages enable row level security;

drop policy if exists "Users read their own shopper conversations" on public.shopper_conversations;
create policy "Users read their own shopper conversations" on public.shopper_conversations for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users add their own shopper conversations" on public.shopper_conversations;
create policy "Users add their own shopper conversations" on public.shopper_conversations for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update their own shopper conversations" on public.shopper_conversations;
create policy "Users update their own shopper conversations" on public.shopper_conversations for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own shopper conversations" on public.shopper_conversations;
create policy "Users delete their own shopper conversations" on public.shopper_conversations for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users read their own shopper messages" on public.shopper_messages;
create policy "Users read their own shopper messages" on public.shopper_messages for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users add messages to their own shopper conversations" on public.shopper_messages;
create policy "Users add messages to their own shopper conversations" on public.shopper_messages for insert to authenticated
with check (
  auth.uid() = user_id and exists (
    select 1 from public.shopper_conversations
    where id = conversation_id and user_id = auth.uid()
  )
);

drop policy if exists "Users delete their own shopper messages" on public.shopper_messages;
create policy "Users delete their own shopper messages" on public.shopper_messages for delete to authenticated
using (auth.uid() = user_id);
