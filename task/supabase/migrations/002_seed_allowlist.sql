-- 002_seed_allowlist.sql
-- Replace with your real emails (case-insensitive due to citext)
insert into public.allowlist(email) values
  ('your_email@example.com'),
  ('partner_email@example.com')
on conflict (email) do nothing;
