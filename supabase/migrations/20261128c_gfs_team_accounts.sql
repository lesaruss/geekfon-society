-- Team accounts that are not on a lesaruss.com address (Sean's own personal account), so Insights > Members leaves them
-- out like every other team account (Sean, 2026-11-28). gfs_member_insights() now excludes role super_admin/admin,
-- lesaruss.com emails and every user_id in this table. Applied live through apply_migration (gfs_team_accounts) the same
-- day; the function body is the one in 20261128b_gfs_member_insights.sql with the isteam CTE added.
CREATE TABLE IF NOT EXISTS gfs_team_accounts (
  user_id uuid PRIMARY KEY,
  note text,
  added_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gfs_team_accounts ENABLE ROW LEVEL SECURITY;
-- Seeded with Sean's personal GeekFon account (matched by member name, role member, not a lesaruss.com email).
