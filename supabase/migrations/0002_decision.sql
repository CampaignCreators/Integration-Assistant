-- Phase 3: the recommended approach and its reasoning.
--
-- `runs.recommended_approach` and `runs.confidence` already exist as free text
-- from 0001; this constrains them to the spec §5.4 vocabulary and adds the
-- rationale the requirements document reads from.

create type public.approach as enum (
  'native', 'native_plus_custom', 'custom', 'middleware', 'not_integrable'
);

create type public.confidence_level as enum ('high', 'medium', 'low');

alter table public.runs
  alter column recommended_approach type public.approach
    using recommended_approach::public.approach,
  alter column confidence type public.confidence_level
    using confidence::public.confidence_level,
  add column approach_rationale text,
  add column approach_details_json jsonb;

-- Mapping rows are edited by reviewers in Phase 4; record who last touched one.
alter table public.field_mappings
  add column edited_by uuid references public.users (id) on delete set null,
  add column edited_at timestamptz;

comment on column public.runs.approach_details_json is
  'Decision basis, override applied, uncertainty drivers, alternatives, '
  'assumptions, risks, open questions, and implementation notes.';
