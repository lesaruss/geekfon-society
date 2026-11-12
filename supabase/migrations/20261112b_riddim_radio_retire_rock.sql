-- GeekFon Radio stations reset (Sean, 2026-11-12: "go with Riddim Radio and retire Rock"; BOSS run in playbook geekfon-radio).
-- Rule: a station opens when it has 3 artists and about 45 minutes that sound alike; every artist also gets artist radio.
-- Applied 2026-11-12 with execute_sql. Safe to run twice.
update gfs_radio_stations set artist_slugs = array['lex-from-brixton','mad-tings','mr-russell'],
  tagline = 'Lex from Brixton, Mad Tings and Mr. Russell', updated_at = now() where slug = 'hip-hop';
update gfs_radio_stations set active = false, updated_at = now() where slug = 'rock';
insert into gfs_radio_stations (slug, name, tagline, artist_slugs, include_remixes, sort_order, active, song_ids, exclusive, color, ink)
values ('riddim', 'Riddim Radio', 'Likkle Bro, Likkle Sis, Nilo Wave and Vuka', array['likkle-bro','likkle-sis','nilo-wave','vuka'],
  false, 22, true, '{}', false, '#EE2D24', '#FFFFFF')
on conflict (slug) do nothing;
