-- Chat lines that share a posted_at showed in random order on the site and in
-- the Writers' Room (Sean, 2026-11-28: Riku's "my whole room" / "my room is a
-- studio" and Logan answering "where do i sleep" before it was asked).
-- Applied live 2026-11-28. Existing ties were spread by insertion order
-- (backup of the old times in gfs_chat_tie_backup_20261128). This trigger
-- keeps every line in a day on its own second so the order is always fixed.
create or replace function public.gfs_chat_line_unique_time() returns trigger language plpgsql set search_path = public as $fn$
begin
  if new.day_id is not null then
    while exists (select 1 from gfs_chat_messages where day_id = new.day_id and posted_at = new.posted_at and id <> new.id) loop
      new.posted_at := new.posted_at + interval '1 second';
    end loop;
  end if;
  return new;
end $fn$;
revoke all on function public.gfs_chat_line_unique_time() from public, anon, authenticated;
drop trigger if exists gfs_chat_line_unique_time on gfs_chat_messages;
create trigger gfs_chat_line_unique_time before insert or update of posted_at, day_id on gfs_chat_messages
for each row execute function public.gfs_chat_line_unique_time();
