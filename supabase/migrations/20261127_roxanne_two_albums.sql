-- Roxanne's two eras (Sean, 2026-11-27): album 1 "Being You, Being Me" ends on
-- "I Just Wanna Be Alone" ("that's when things fell apart for her"); album 2 is
-- "Stronger Together", the comeback. Applied live through execute_sql the same day.
DO $roxalbums$
DECLARE a1 uuid := '4c83a858-1666-4667-a52c-f72c40a26a3d'; a2 uuid := 'f3f80fd3-88c8-4edd-a2b2-9d389d1ce93d';
BEGIN
  UPDATE gfs_albums SET title='Stronger Together', working_title='Stronger Together', updated_at=now() WHERE id=a2;
  UPDATE gfs_albums SET track_target=8, updated_at=now() WHERE id=a1;
  UPDATE gfs_album_tracks t SET album_id=a1, kind='track', position=8 FROM pulse_songs s WHERE s.id=t.song_id AND s.primary_artist_slug='roxanne' AND s.title='I Just Wanna Be Alone';
  UPDATE gfs_album_tracks t SET album_id=a1, kind='remix', position=6 FROM pulse_songs s WHERE s.id=t.song_id AND s.primary_artist_slug='roxanne' AND s.title='I Just Wanna Be Alone (Remix)';
  UPDATE gfs_album_tracks t SET position=1 FROM pulse_songs s WHERE s.id=t.song_id AND t.album_id=a2 AND s.title='Stronger Together (feat. Riku)';
  UPDATE gfs_album_tracks t SET position=2 FROM pulse_songs s WHERE s.id=t.song_id AND t.album_id=a2 AND s.title='I''m More Than Enough';
  UPDATE gfs_album_tracks t SET position=3 FROM pulse_songs s WHERE s.id=t.song_id AND t.album_id=a2 AND s.title='I Need My Space (feat. Lex from Brixton)';
END $roxalbums$;
