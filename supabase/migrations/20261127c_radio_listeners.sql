-- Radio listener tracking v2 (Sean, 2026-11-27): "I don't know if people might
-- just have it playing and never sign up... Can we tell?"
-- radio_presence (2026-07-27) only kept a tab's first and last heartbeat. This
-- records, per listening session: real seconds played, station, songs, where
-- the listener came from, phone or computer, and whether they are signed in.
-- A device id (kept in the browser) links sessions, so a listener who later
-- signs up in the same browser is counted as a conversion. Team devices
-- (a lesaruss.com account, or ?team=1 on the radio) are left out of the report.
-- Anonymous by design: no name, email or IP is stored. Written only by the
-- service role (the /api/radio/ping and /api/radio/claim routes); read by the
-- admin Command Center through radio_listener_report().
-- Applied live through execute_sql the same day.

CREATE TABLE IF NOT EXISTS radio_devices (
  device_id     text PRIMARY KEY,
  user_id       uuid,
  team          boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  claimed_at    timestamptz
);

CREATE TABLE IF NOT EXISTS radio_listen_sessions (
  session_id       text PRIMARY KEY,
  device_id        text NOT NULL,
  user_id          uuid,
  surface          text,            -- 'radio' (the /radio player) or 'mini' (the site-wide mini player)
  first_seen_at    timestamptz NOT NULL DEFAULT now(),
  last_ping_at     timestamptz NOT NULL DEFAULT now(),
  listened_seconds integer NOT NULL DEFAULT 0,
  first_station    text,
  last_station     text,
  referrer_host    text,
  landing_path     text,
  utm_source       text,
  device_type      text             -- 'phone' | 'tablet' | 'computer'
);
CREATE INDEX IF NOT EXISTS radio_listen_sessions_device_idx ON radio_listen_sessions (device_id);
CREATE INDEX IF NOT EXISTS radio_listen_sessions_first_idx ON radio_listen_sessions (first_seen_at);

CREATE TABLE IF NOT EXISTS radio_listen_songs (
  session_id text NOT NULL,
  station    text NOT NULL,
  song_key   text NOT NULL,         -- depot song id, else "title|artist"
  title      text,
  artist     text,
  seconds    integer NOT NULL DEFAULT 0,
  first_at   timestamptz NOT NULL DEFAULT now(),
  last_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, station, song_key)
);

ALTER TABLE radio_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_listen_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_listen_songs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION radio_listen_ping(
  p_session text, p_device text, p_user uuid, p_team boolean, p_seconds integer,
  p_station text, p_song_key text, p_title text, p_artist text,
  p_referrer_host text, p_landing text, p_utm text, p_device_type text, p_surface text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE s integer := greatest(0, least(coalesce(p_seconds, 0), 60));
BEGIN
  INSERT INTO radio_devices (device_id, user_id, team)
  VALUES (p_device, p_user, coalesce(p_team, false))
  ON CONFLICT (device_id) DO UPDATE SET
    user_id = coalesce(radio_devices.user_id, EXCLUDED.user_id),
    claimed_at = CASE WHEN radio_devices.user_id IS NULL AND EXCLUDED.user_id IS NOT NULL THEN now() ELSE radio_devices.claimed_at END,
    team = radio_devices.team OR EXCLUDED.team;

  INSERT INTO radio_listen_sessions AS r (session_id, device_id, user_id, surface, listened_seconds, first_station, last_station,
    referrer_host, landing_path, utm_source, device_type)
  VALUES (p_session, p_device, p_user, p_surface, s, p_station, p_station, p_referrer_host, p_landing, p_utm, p_device_type)
  ON CONFLICT (session_id) DO UPDATE SET
    last_ping_at = now(),
    listened_seconds = r.listened_seconds + s,
    last_station = coalesce(EXCLUDED.last_station, r.last_station),
    user_id = coalesce(r.user_id, EXCLUDED.user_id);

  IF p_song_key IS NOT NULL AND p_station IS NOT NULL THEN
    INSERT INTO radio_listen_songs AS g (session_id, station, song_key, title, artist, seconds)
    VALUES (p_session, p_station, p_song_key, p_title, p_artist, s)
    ON CONFLICT (session_id, station, song_key) DO UPDATE SET seconds = g.seconds + s, last_at = now();
  END IF;
END $fn$;

-- A signed-in visit on a device that listened before: link the device to the account.
CREATE OR REPLACE FUNCTION radio_claim_device(p_device text, p_user uuid, p_team boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  UPDATE radio_devices SET
    user_id = coalesce(user_id, p_user),
    claimed_at = CASE WHEN user_id IS NULL THEN now() ELSE claimed_at END,
    team = team OR coalesce(p_team, false)
  WHERE device_id = p_device;
END $fn$;

-- The Command Center's listener panel, one call. Team devices excluded.
CREATE OR REPLACE FUNCTION radio_listener_report(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
WITH team AS (SELECT device_id FROM radio_devices WHERE team),
ses AS (
  SELECT s.*, d.user_id AS device_user, d.first_seen_at AS device_first
  FROM radio_listen_sessions s JOIN radio_devices d USING (device_id)
  WHERE s.first_seen_at > now() - make_interval(days => p_days)
    AND s.listened_seconds > 0
    AND s.device_id NOT IN (SELECT device_id FROM team)
),
dev AS (
  SELECT device_id, max(device_user::text)::uuid AS user_id, min(device_first) AS first_listen,
         count(DISTINCT (first_seen_at AT TIME ZONE 'America/New_York')::date) AS days,
         sum(listened_seconds) AS secs
  FROM ses GROUP BY device_id
),
acct AS (
  SELECT dev.*, u.created_at AS signed_up_at FROM dev LEFT JOIN auth.users u ON u.id = dev.user_id
)
SELECT jsonb_build_object(
  'days', p_days,
  'listening_now', (SELECT count(DISTINCT device_id) FROM radio_listen_sessions
                     WHERE last_ping_at > now() - interval '60 seconds' AND device_id NOT IN (SELECT device_id FROM team)),
  'listeners', (SELECT count(*) FROM dev),
  'sessions', (SELECT count(*) FROM ses),
  'minutes', (SELECT round(coalesce(sum(secs), 0) / 60.0) FROM dev),
  'avg_minutes_per_listener', (SELECT round(coalesce(avg(secs), 0) / 60.0, 1) FROM dev),
  'returning', (SELECT count(*) FROM dev WHERE days > 1),
  'anonymous', (SELECT count(*) FROM acct WHERE user_id IS NULL),
  'signed_in', (SELECT count(*) FROM acct WHERE user_id IS NOT NULL),
  'converted', (SELECT count(*) FROM acct WHERE signed_up_at > first_listen),
  'team_excluded', (SELECT count(*) FROM team),
  'by_station', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'minutes')::numeric DESC), '[]') FROM (
      SELECT jsonb_build_object('station', g.station, 'listeners', count(DISTINCT s.device_id), 'minutes', round(sum(g.seconds) / 60.0)) x
      FROM radio_listen_songs g JOIN ses s USING (session_id) GROUP BY g.station) t),
  'top_songs', (SELECT coalesce(jsonb_agg(x), '[]') FROM (
      SELECT jsonb_build_object('title', max(g.title), 'artist', max(g.artist), 'listeners', count(DISTINCT s.device_id), 'minutes', round(sum(g.seconds) / 60.0)) x
      FROM radio_listen_songs g JOIN ses s USING (session_id) GROUP BY g.song_key ORDER BY sum(g.seconds) DESC LIMIT 10) t),
  'sources', (SELECT coalesce(jsonb_agg(x), '[]') FROM (
      SELECT jsonb_build_object('source', coalesce(utm_source, referrer_host, 'direct'), 'listeners', count(DISTINCT device_id)) x
      FROM ses GROUP BY coalesce(utm_source, referrer_host, 'direct') ORDER BY count(DISTINCT device_id) DESC LIMIT 8) t),
  'devices', (SELECT coalesce(jsonb_agg(x), '[]') FROM (
      SELECT jsonb_build_object('device', coalesce(device_type, 'unknown'), 'listeners', count(DISTINCT device_id)) x
      FROM ses GROUP BY coalesce(device_type, 'unknown') ORDER BY count(DISTINCT device_id) DESC) t),
  'daily', (SELECT coalesce(jsonb_agg(x ORDER BY x->>'date'), '[]') FROM (
      SELECT jsonb_build_object('date', (first_seen_at AT TIME ZONE 'America/New_York')::date, 'listeners', count(DISTINCT device_id), 'minutes', round(sum(listened_seconds) / 60.0)) x
      FROM ses GROUP BY (first_seen_at AT TIME ZONE 'America/New_York')::date) t)
);
$fn$;

REVOKE ALL ON FUNCTION radio_listen_ping(text, text, uuid, boolean, integer, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION radio_claim_device(text, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION radio_listener_report(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION radio_listen_ping(text, text, uuid, boolean, integer, text, text, text, text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION radio_claim_device(text, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION radio_listener_report(integer) TO service_role;
