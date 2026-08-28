-- Fixes the `rls_disabled_in_public` advisor warning.
--
-- Every table lives in the `public` schema, which Supabase exposes through
-- PostgREST. Without RLS, anyone holding the project's anon key - which is
-- publishable by design, not a secret - could read, edit and delete all of
-- it. Turning RLS on with no policies denies the anon and authenticated
-- roles outright.
--
-- This app only ever talks to the database from server code using the
-- service role key, and the service role bypasses RLS, so no policies are
-- needed and nothing in the app has to change.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table members enable row level security;
alter table books enable row level security;
alter table scores enable row level security;
alter table club_settings enable row level security;

-- Unused today (voting is on hold) but still exposed, so lock them too.
alter table rounds enable row level security;
alter table votes enable row level security;
