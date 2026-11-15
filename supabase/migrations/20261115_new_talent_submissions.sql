-- New Talent submissions (Sean, 2026-11-15: "build the artist submission page for New Talent").
-- Playbook geekfon-radio, Phase 2: New Talent station and submissions. Free to submit (no pay-to-play).
-- Written only by /api/new-talent (service role); no public policies, so the anon key reads and writes nothing.
-- Audio lives in the private bucket gfs-new-talent; songs[] holds {title, kind: 'file'|'link', path|url}.

create table if not exists public.gfs_new_talent_submissions (
  id uuid primary key default gen_random_uuid(),
  artist_name text not null,
  contact_name text not null,
  email text not null,
  city text,
  genre text not null,
  bio text,
  links text,
  songs jsonb not null default '[]'::jsonb,
  owns_rights boolean not null default false,
  permission_to_play boolean not null default false,
  status text not null default 'pending',
  decision text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  constraint gfs_ntsub_rights check (owns_rights and permission_to_play),
  constraint gfs_ntsub_songs check (jsonb_typeof(songs) = 'array' and jsonb_array_length(songs) between 1 and 3)
);

create index if not exists gfs_new_talent_submissions_status_idx on public.gfs_new_talent_submissions (status, created_at desc);

alter table public.gfs_new_talent_submissions enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gfs-new-talent', 'gfs-new-talent', false, 52428800,
        array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/x-m4a','audio/aac','audio/flac','audio/x-flac'])
on conflict (id) do nothing;
