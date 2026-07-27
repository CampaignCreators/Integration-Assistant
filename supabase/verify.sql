-- Confirms schema.sql applied correctly. Paste into the Supabase SQL editor and
-- run it; every row should read PASS.
--
-- Worth running after any schema change. Privileges and policies do not show up
-- in the app's tests — the previous version of this tool shipped a migration that
-- silently locked out its own worker, and this is the check that would have caught
-- it.

with checks(label, ok) as (
  values
    ('runs table exists',
      to_regclass('public.runs') is not null),

    ('row-level security is on',
      (select relrowsecurity from pg_class where oid = 'public.runs'::regclass)),

    ('all four policies exist',
      (select count(*) from pg_policies
        where schemaname = 'public' and tablename = 'runs') = 4),

    ('signed-in users can read their runs',
      has_table_privilege('authenticated', 'public.runs', 'select')),

    ('signed-in users can create runs',
      has_table_privilege('authenticated', 'public.runs', 'insert')),

    ('signed-in users can update runs',
      has_table_privilege('authenticated', 'public.runs', 'update')),

    ('signed-in users can delete runs',
      has_table_privilege('authenticated', 'public.runs', 'delete')),

    ('anonymous callers are refused',
      not has_table_privilege('anon', 'public.runs', 'select')),

    ('updated_at trigger is attached',
      exists (select 1 from pg_trigger
        where tgrelid = 'public.runs'::regclass and tgname = 'runs_touch')),

    ('uploads bucket exists',
      exists (select 1 from storage.buckets where id = 'uploads')),

    ('uploads bucket is private',
      not coalesce((select public from storage.buckets where id = 'uploads'), true)),

    ('storage policies exist',
      (select count(*) from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname like 'uploads:%') = 3)
)
select case when ok then 'PASS' else 'FAIL' end as result, label
from checks
order by ok, label;
