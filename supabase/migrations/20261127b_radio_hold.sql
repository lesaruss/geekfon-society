-- Radio hold (Sean, 2026-11-27): "hold it until the cover art is done."
-- A song with radio_hold = true plays on no station (main, genre, seasonal or
-- artist radio) until the hold is lifted. New songs join their artist's
-- stations automatically on import, so this is the switch that makes a
-- release wait for its cover art. Lift it with:
--   UPDATE pulse_songs SET radio_hold = false WHERE id = '<song id>';
-- First use: Roxanne, "The Next One", held until its cover art is approved.
-- Applied live through execute_sql the same day.
DO $radiohold$
BEGIN
  ALTER TABLE pulse_songs ADD COLUMN IF NOT EXISTS radio_hold boolean NOT NULL DEFAULT false;
  COMMENT ON COLUMN pulse_songs.radio_hold IS 'True keeps the song off every GeekFon Radio station (e.g. until cover art is done). Sean 2026-11-27.';
  UPDATE pulse_songs SET radio_hold = true WHERE id = 'fe100589-431c-4b66-b943-859980603023';
END $radiohold$;
