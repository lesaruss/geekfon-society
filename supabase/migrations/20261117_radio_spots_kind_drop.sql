-- Artist drops (Sean, 2026-11-17): short station IDs voiced by the artist on their own radio,
-- told apart from sponsor spots so the player doesn't call them "a word from a sponsor".
alter table public.radio_spots add column if not exists kind text not null default 'sponsor';
alter table public.radio_spots drop constraint if exists radio_spots_kind_check;
alter table public.radio_spots add constraint radio_spots_kind_check check (kind in ('sponsor','drop'));
