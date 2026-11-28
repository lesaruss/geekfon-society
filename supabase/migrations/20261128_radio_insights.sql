-- BrandDesk > GeekFon Society > Insights > Radio (Sean, 2026-11-28; map locked in playbook geekfon-launch,
-- canon canon-brand-admin-in-branddesk). radio_insights(p_from, p_to): the period (Eastern days, inclusive)
-- and the same-length period before, team devices excluded. Read by HQ (lesaruss-hq lib/radioInsights.ts).
-- Service role only. Applied live through apply_migration (name radio_insights) the same day.
CREATE OR REPLACE FUNCTION radio_insights(p_from date, p_to date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
WITH b AS (
  SELECT (p_from::timestamp AT TIME ZONE 'America/New_York') AS t0,
         ((p_to + 1)::timestamp AT TIME ZONE 'America/New_York') AS t1,
         ((p_from - (p_to - p_from + 1))::timestamp AT TIME ZONE 'America/New_York') AS p0
),
team AS (SELECT device_id FROM radio_devices WHERE team),
ses_all AS (
  SELECT s.*, d.user_id AS device_user, d.first_seen_at AS device_first
  FROM radio_listen_sessions s JOIN radio_devices d USING (device_id)
  WHERE s.listened_seconds > 0 AND s.device_id NOT IN (SELECT device_id FROM team)
),
ses AS (SELECT * FROM ses_all, b WHERE first_seen_at >= b.t0 AND first_seen_at < b.t1),
prev AS (SELECT * FROM ses_all, b WHERE first_seen_at >= b.p0 AND first_seen_at < b.t0),
dev AS (
  SELECT device_id, max(device_user::text)::uuid AS user_id, min(device_first) AS first_listen,
         count(DISTINCT (first_seen_at AT TIME ZONE 'America/New_York')::date) AS days, sum(listened_seconds) AS secs
  FROM ses GROUP BY device_id
),
acct AS (SELECT dev.*, u.created_at AS signed_up_at FROM dev LEFT JOIN auth.users u ON u.id = dev.user_id),
pdev AS (SELECT device_id, max(device_user::text)::uuid AS user_id, min(device_first) AS first_listen, sum(listened_seconds) AS secs FROM prev GROUP BY device_id),
pacct AS (SELECT pdev.*, u.created_at AS signed_up_at FROM pdev LEFT JOIN auth.users u ON u.id = pdev.user_id),
songs AS (SELECT g.*, s.device_id FROM radio_listen_songs g JOIN ses s USING (session_id)),
plays AS (SELECT p.* FROM gfs_track_plays p, b WHERE p.played_at >= b.t0 AND p.played_at < b.t1),
pplays AS (SELECT count(*) n FROM gfs_track_plays p, b WHERE p.played_at >= b.p0 AND p.played_at < b.t0),
votes AS (SELECT v.* FROM gfs_artist_votes v, b WHERE v.voted_at >= b.t0 AND v.voted_at < b.t1),
artists AS (SELECT slug, name FROM gfs_artists)
SELECT jsonb_build_object(
  'from', p_from, 'to', p_to,
  'tracking_started', (SELECT min(first_seen_at) FROM radio_listen_sessions),
  'listening_now', (SELECT count(DISTINCT device_id) FROM radio_listen_sessions
                    WHERE last_ping_at > now() - interval '60 seconds' AND device_id NOT IN (SELECT device_id FROM team)),
  'totals', jsonb_build_object(
    'listeners', (SELECT count(*) FROM dev),
    'sessions', (SELECT count(*) FROM ses),
    'minutes', (SELECT round(coalesce(sum(secs), 0) / 60.0) FROM dev),
    'avg_minutes', (SELECT round(coalesce(avg(secs), 0) / 60.0, 1) FROM dev),
    'returning', (SELECT count(*) FROM dev WHERE days > 1),
    'anonymous', (SELECT count(*) FROM acct WHERE user_id IS NULL),
    'signed_in', (SELECT count(*) FROM acct WHERE user_id IS NOT NULL),
    'converted', (SELECT count(*) FROM acct WHERE signed_up_at > first_listen),
    'plays', (SELECT count(*) FROM plays)),
  'prev', jsonb_build_object(
    'listeners', (SELECT count(*) FROM pdev),
    'sessions', (SELECT count(*) FROM prev),
    'minutes', (SELECT round(coalesce(sum(secs), 0) / 60.0) FROM pdev),
    'avg_minutes', (SELECT round(coalesce(avg(secs), 0) / 60.0, 1) FROM pdev),
    'converted', (SELECT count(*) FROM pacct WHERE signed_up_at > first_listen),
    'plays', (SELECT n FROM pplays)),
  'daily', (SELECT coalesce(jsonb_agg(x ORDER BY x->>'t'), '[]') FROM (
      SELECT jsonb_build_object('t', (first_seen_at AT TIME ZONE 'America/New_York')::date, 'listeners', count(DISTINCT device_id), 'minutes', round(sum(listened_seconds) / 60.0)) x
      FROM ses GROUP BY (first_seen_at AT TIME ZONE 'America/New_York')::date) t),
  'stations', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'minutes')::numeric DESC), '[]') FROM (
      SELECT jsonb_build_object('station', station, 'listeners', count(DISTINCT device_id), 'minutes', round(sum(seconds) / 60.0)) x
      FROM songs GROUP BY station) t),
  'songs', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'minutes')::numeric DESC), '[]') FROM (
      SELECT jsonb_build_object('title', max(title), 'artist', max(artist), 'listeners', count(DISTINCT device_id), 'minutes', round(sum(seconds) / 60.0, 1)) x
      FROM songs GROUP BY song_key ORDER BY sum(seconds) DESC LIMIT 50) t),
  'sources', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'listeners')::int DESC), '[]') FROM (
      SELECT jsonb_build_object('source', coalesce(utm_source, referrer_host, 'direct'), 'listeners', count(DISTINCT device_id), 'minutes', round(sum(listened_seconds) / 60.0)) x
      FROM ses GROUP BY coalesce(utm_source, referrer_host, 'direct')) t),
  'devices', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'listeners')::int DESC), '[]') FROM (
      SELECT jsonb_build_object('device', coalesce(device_type, 'unknown'), 'listeners', count(DISTINCT device_id)) x
      FROM ses GROUP BY coalesce(device_type, 'unknown')) t),
  'surfaces', (SELECT coalesce(jsonb_agg(x), '[]') FROM (
      SELECT jsonb_build_object('surface', coalesce(surface, 'radio'), 'listeners', count(DISTINCT device_id), 'minutes', round(sum(listened_seconds) / 60.0)) x
      FROM ses GROUP BY coalesce(surface, 'radio')) t),
  'artists', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'radio_minutes')::numeric DESC, (x->>'plays')::int DESC), '[]') FROM (
      SELECT jsonb_build_object('slug', a.slug, 'name', a.name,
        'radio_minutes', coalesce((SELECT round(sum(s.seconds) / 60.0) FROM songs s WHERE s.artist = a.name), 0),
        'radio_listeners', coalesce((SELECT count(DISTINCT s.device_id) FROM songs s WHERE s.artist = a.name), 0),
        'plays', (SELECT count(*) FROM plays p WHERE p.artist_slug = a.slug),
        'votes', (SELECT coalesce(sum(v.vote_count), 0) FROM votes v WHERE v.artist_slug = a.slug),
        'all_time_score', coalesce((SELECT r.score FROM gfs_artist_rankings r WHERE r.slug = a.slug), 0)) x
      FROM artists a) t)
);
$fn$;
REVOKE ALL ON FUNCTION radio_insights(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION radio_insights(date, date) TO service_role;
