-- Restore authenticated reads for V2 option items. Owner isolation remains
-- enforced by recommendation_option_items_v2_owner_read RLS.
grant select on table public.recommendation_option_items_v2 to authenticated;
