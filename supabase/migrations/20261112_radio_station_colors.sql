-- GeekFon Radio: each station's color and ink live in the database (Sean, 2026-11-11: "each station's colors and art
-- come from the database, so the GeekFon brand sequence updates the player without code"). Wheel colors from the
-- GeekFon brand kit (ve_brand_cartridges geekfon-society). The main station (GeekFon Radio) is defined in code
-- (MAIN_STATION in lib/server/radio.ts) and uses wheel yellow #ECE22D with ink #0B0B0C.
alter table gfs_radio_stations add column if not exists color text, add column if not exists ink text;
update gfs_radio_stations set color = v.c, ink = v.i
from (values ('anime','#9B2A90','#FFFFFF'), ('hip-hop','#F69820','#0B0B0C'), ('rock','#EE2D24','#FFFFFF'), ('holiday','#7CC245','#0B0B0C')) v(s, c, i)
where slug = v.s and color is null;
