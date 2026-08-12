-- Allow scores below 1 (half points like 0.5, and 0 itself). The original
-- constraint floored ratings at 1, which silently rejected them at the
-- database level even when the form allowed the value.
-- Run once in the Supabase SQL editor.

alter table scores drop constraint if exists scores_score_or_absent;

alter table scores add constraint scores_score_or_absent check (
  (absent and score is null) or (not absent and score is not null and score >= 0 and score <= 10)
);
