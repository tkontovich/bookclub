-- Run this in the Supabase SQL editor against your existing project to
-- support marking a member absent (no score) for a given book, and to
-- drop the voting-related "next picker" setting now that proposing/voting
-- is on hold. Safe to run once; each statement is idempotent-ish for a
-- fresh run.

alter table scores drop constraint if exists scores_score_check;
alter table scores alter column score drop not null;
alter table scores add column if not exists absent boolean not null default false;
alter table scores add constraint scores_score_or_absent check (
  (absent and score is null) or (not absent and score is not null and score >= 1 and score <= 10)
);

alter table club_settings drop column if exists next_picker_id;

-- The `rounds` and `votes` tables are unused for now (voting is on hold)
-- but left in place in case it comes back later.
