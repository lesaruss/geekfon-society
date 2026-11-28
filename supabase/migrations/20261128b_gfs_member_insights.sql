-- BrandDesk > GeekFon Society > Insights > Members (Sean, 2026-11-28; map locked in playbook geekfon-launch).
-- GeekFon members are gfs_members rows. Team accounts (role super_admin/admin, or a lesaruss.com email) are left out.
-- The period is Eastern days, inclusive, with the same-length period before. Read by HQ (lesaruss-hq
-- lib/radioInsights.ts memberInsights). Service role only. Applied live through apply_migration the same day.
CREATE OR REPLACE FUNCTION gfs_member_insights(p_from date, p_to date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
WITH b AS (
  SELECT (p_from::timestamp AT TIME ZONE 'America/New_York') AS t0,
         ((p_to + 1)::timestamp AT TIME ZONE 'America/New_York') AS t1,
         ((p_from - (p_to - p_from + 1))::timestamp AT TIME ZONE 'America/New_York') AS p0
),
m AS (
  SELECT g.*, u.last_sign_in_at
  FROM gfs_members g LEFT JOIN auth.users u ON u.id = g.user_id
  WHERE coalesce(g.role, 'member') NOT IN ('super_admin', 'admin')
    AND coalesce(u.email, '') NOT ILIKE '%@lesaruss.com'
),
team AS (SELECT count(*) n FROM gfs_members g LEFT JOIN auth.users u ON u.id = g.user_id
         WHERE coalesce(g.role, 'member') IN ('super_admin', 'admin') OR coalesce(u.email, '') ILIKE '%@lesaruss.com'),
newp AS (SELECT m.* FROM m, b WHERE m.created_at >= b.t0 AND m.created_at < b.t1),
listened AS (SELECT DISTINCT user_id FROM radio_devices WHERE user_id IS NOT NULL AND NOT team)
SELECT jsonb_build_object(
  'from', p_from, 'to', p_to,
  'team_excluded', (SELECT n FROM team),
  'totals', jsonb_build_object(
    'members', (SELECT count(*) FROM m, b WHERE m.created_at < b.t1),
    'new', (SELECT count(*) FROM newp),
    'active', (SELECT count(*) FROM m, b WHERE m.last_sign_in_at >= b.t0 AND m.last_sign_in_at < b.t1),
    'pro', (SELECT count(*) FROM m WHERE is_pro),
    'minors', (SELECT count(*) FROM m WHERE is_minor),
    'referred', (SELECT count(*) FROM newp WHERE referred_by_ref_code IS NOT NULL),
    'radio_listeners', (SELECT count(*) FROM m WHERE user_id IN (SELECT user_id FROM listened))),
  'prev', jsonb_build_object(
    'members', (SELECT count(*) FROM m, b WHERE m.created_at < b.t0),
    'new', (SELECT count(*) FROM m, b WHERE m.created_at >= b.p0 AND m.created_at < b.t0),
    'active', (SELECT count(*) FROM m, b WHERE m.last_sign_in_at >= b.p0 AND m.last_sign_in_at < b.t0)),
  'daily', (SELECT coalesce(jsonb_agg(x ORDER BY x->>'t'), '[]') FROM (
      SELECT jsonb_build_object('t', (created_at AT TIME ZONE 'America/New_York')::date, 'n', count(*)) x
      FROM newp GROUP BY (created_at AT TIME ZONE 'America/New_York')::date) t),
  'tiers', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'n')::int DESC), '[]') FROM (
      SELECT jsonb_build_object('tier', coalesce(tier, 'free'), 'n', count(*)) x FROM m GROUP BY coalesce(tier, 'free')) t),
  'favorite_artists', (SELECT coalesce(jsonb_agg(x ORDER BY (x->>'n')::int DESC), '[]') FROM (
      SELECT jsonb_build_object('slug', a, 'name', coalesce(max(ar.name), a), 'n', count(*)) x
      FROM m, unnest(coalesce(m.passport_artists, '{}')) a LEFT JOIN gfs_artists ar ON ar.slug = a GROUP BY a) t),
  'newest', (SELECT coalesce(jsonb_agg(x ORDER BY x->>'joined' DESC), '[]') FROM (
      SELECT jsonb_build_object('name', coalesce(nullif(name, ''), 'No name yet'), 'joined', created_at, 'tier', coalesce(tier, 'free'),
        'listened_first', user_id IN (SELECT user_id FROM listened), 'last_seen', last_sign_in_at) x
      FROM m ORDER BY created_at DESC LIMIT 25) t)
);
$fn$;
REVOKE ALL ON FUNCTION gfs_member_insights(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION gfs_member_insights(date, date) TO service_role;
