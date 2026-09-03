-- Add a Women/Men wardrobe hierarchy while preserving every existing item.
-- Safe to run more than once in the Supabase SQL editor.

alter table public.clothing_items
  add column if not exists department text not null default 'Women',
  add column if not exists subcategory text;

update public.clothing_items
set department = 'Women'
where department is null or department not in ('Women', 'Men');

create index if not exists clothing_items_user_department_category_idx
  on public.clothing_items (user_id, department, category);
