-- Member comments, one level of replies, and likes on the artists' group chat
-- (Sean, 2026-11-04). Applied to the live project as migration
-- "gfs_chat_comments_and_likes". Any signed-in account likes; supporters of
-- the artist whose page they are on comment and reply; every comment is held
-- until staff approve it. Server-only: RLS on, no policies (service role).
CREATE TABLE IF NOT EXISTS public.gfs_chat_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.gfs_chat_messages(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.gfs_chat_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  artist_slug text NOT NULL,
  author_name text NOT NULL DEFAULT 'A fan',
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by text
);
CREATE INDEX IF NOT EXISTS gfs_chat_comments_message_idx ON public.gfs_chat_comments (message_id, created_at);
CREATE INDEX IF NOT EXISTS gfs_chat_comments_status_idx ON public.gfs_chat_comments (status, created_at);
CREATE INDEX IF NOT EXISTS gfs_chat_comments_user_idx ON public.gfs_chat_comments (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.gfs_chat_likes (
  target_kind text NOT NULL CHECK (target_kind IN ('message','comment')),
  target_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (target_kind, target_id, user_id)
);
CREATE INDEX IF NOT EXISTS gfs_chat_likes_target_idx ON public.gfs_chat_likes (target_kind, target_id);

ALTER TABLE public.gfs_chat_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gfs_chat_likes ENABLE ROW LEVEL SECURITY;
