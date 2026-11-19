#!/usr/bin/env python3
"""Reel 3: Shamanic Resin, "Hasta La Vista Maybe", in the launch-reel template (Sean 2026-11-19:
"follow the same format, switch up the styling, but the general look should be the same ... same
call to action at the end"). Same beats and layout as Reel 2 (Straight & Narrow): full-width LIVE
bar, halftone colour per beat, yellow highlighter captions, art in a black-bordered card, name plate,
the radio NOW PLAYING card, the "Tune in. It's free." close. What changes: the colour order starts on
blue, LoLA's outfit (black Shamanic Resin tee), her question line, the song, and vertical MV
highlights redrawn for 9:16 (no horizontal MV frames). Each frame is then given the Reel 2 v2 frame:
scaled to 82% inside a soft, blurred copy of itself, so everything sits inside the safe margins.

usage: python3 releases/shamanic-resin-hasta-la-vista-maybe.reel3.py ART OUT LOGO COVER
  ART: lola-hook.png, lola-q.png (with the tee print), aoi.png, momo.png, band.png (9:16)
The board (stills for Sean) is the CLI; assemble_reel.py imports this module, calls setup() and
renders each beat in BEATS once per video frame, with the Wan clip frame as the art, then post().
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from design_kit import *
import design_kit as K
from PIL import ImageFilter, ImageEnhance

ART = COVER_IM = None
_cache = {}


def setup(art, logo, cover):
    global ART, COVER_IM
    ART = art; set_logo(logo); COVER_IM = Image.open(cover).convert('RGB')


def A(n):
    if n not in _cache:
        _cache[n] = Image.open(os.path.join(ART, n)).convert('RGB')
    return _cache[n]
W, H = 1080, 1920
TITLE, ARTIST = 'Hasta La Vista Maybe', 'Shamanic Resin'
PLATE = ('SHAMANIC RESIN', 'Rock · Anime · GeekFon Society')
ANIME = (155, 42, 144)


def top_bar(im):
    """Reel 1/2's full-width black bar: lockup left, red dot LIVE right."""
    d = ImageDraw.Draw(im); d.rectangle((0, 0, W, 150), fill=INK)
    lg = K._logo.resize((84, 84), Image.LANCZOS); im.paste(lg, (48, 33), lg)
    d.text((144, 30), 'GEEKFON', font=F8(44), fill=WHITE); d.text((147, 82), 'S O C I E T Y', font=F8(19), fill=ORANGE)
    f = F8(30); tw = d.textlength('LIVE', font=f); d.text((W - 52 - tw, 58), 'LIVE', font=f, fill=WHITE)
    d.ellipse((W - 52 - tw - 34, 66, W - 52 - tw - 16, 84), fill=REEL['red'])


def footer(im):
    d = ImageDraw.Draw(im); f = FIG(28); s = 'AI artists · voices performed by the founder'; tw = d.textlength(s, font=f)
    d.rounded_rectangle((W - 40 - tw - 32, H - 76, W - 40, H - 28), radius=10, fill=(30, 18, 40)); d.text((W - 40 - tw - 16, H - 70), s, font=f, fill=WHITE)


def _ground(color):
    """The halftone field and top bar, drawn once per colour (the assembler calls a beat per frame)."""
    if ('g', color) not in _cache:
        g = halftone(W, H, REEL[color]); top_bar(g); _cache[('g', color)] = g
    return _cache[('g', color)].copy()


def beat(color, headline, art, size=104, plate=None, fy=0.3, lines=None):
    """lines=N fixes the caption area at N lines (shorter captions centred in it), so the card never moves
    between beats that share one continuous clip (Sean 2026-11-19: LoLA's intro must read as one take)."""
    im = _ground(color)
    if lines:
        d = ImageDraw.Draw(im); n = len(wrap(d, headline, BRIC(size), W - 120 - 2 * int(size * 0.22)))
        highlight(im, headline, (60, 200 + (lines - n) * size * 1.18 / 2, W - 60, H), size)
        y = int(200 + lines * size * 1.18) + 70
    else:
        y = highlight(im, headline, (60, 200, W - 60, H), size) + 70
    cw = 700; ch = H - 260 - y
    card(im, art, ((W - cw) // 2, y, (W + cw) // 2, y + ch), fy=fy, border=12, shadow=18)
    if plate:
        name_plate(im, plate[0], plate[1], (W - cw) // 2 - 30, y + ch - 140, size=58)
    footer(im); return im


def cover_beat(color, headline, cov):
    """The full single cover, big and square (Sean 2026-11-19: "a full album cover shot somewhere in there")."""
    im = _ground(color)
    y = highlight(im, headline, (60, 200, W - 60, H), 104) + 80
    side = 900; card(im, cov, ((W - side) // 2, y, (W + side) // 2, y + side), fit='stretch', border=12, shadow=18)
    d = ImageDraw.Draw(im); f = BRIC(70)
    for k, line in enumerate((TITLE, ARTIST)):
        ff = f if k == 0 else FIG(52); tw = d.textlength(line, font=ff)
        d.text(((W - tw) / 2, y + side + 60 + k * 96), line, font=ff, fill=INK)
    footer(im); return im


def radio(art, lyric):
    """Reel 2's radio screen: station cards, LIVE station art, NOW PLAYING, lyric, title, progress."""
    bg = art.resize((W, round(art.height * W / art.width))).crop((0, 0, W, H)).filter(ImageFilter.GaussianBlur(50))
    bg = ImageEnhance.Brightness(bg).enhance(0.45)
    tint = grad(W, H, (120, 70, 20), (30, 60, 110), horizontal=False); im = Image.blend(bg, tint, 0.45); top_bar(im)
    d = ImageDraw.Draw(im)
    cards = [('GeekFon', HILITE, INK, 'cover-thumb'), ('Anime', ANIME, WHITE, 'aoi'), ('Hip Hop', REEL['orange'], INK, 'hiphop')]
    for i, (name, col, ink, thumb) in enumerate(cards):
        x = 40 + i * 340; d.rounded_rectangle((x, 192, x + 316, 440), radius=22, fill=col)
        d.text((x + 38, 222), name, font=BRIC(56), fill=ink)
        if thumb:
            t = cover(A(thumb + '.png'), 110, 120, 0.5, 0.25); im.paste(t, (x + 190, 300))
        if name == 'Anime':
            d.rounded_rectangle((x - 6, 186, x + 322, 446), radius=26, outline=WHITE, width=8)
            d.rounded_rectangle((x + 34, 360, x + 300, 420), radius=12, fill=INK)
            for k, bh in enumerate((12, 22, 32)): d.rectangle((x + 54 + k * 10, 404 - bh, x + 60 + k * 10, 404), fill=WHITE)
            d.text((x + 96, 372), 'TUNED IN', font=F8(30), fill=WHITE)
    ax, ay, aw, ah = 60, 500, 960, 960
    a = cover(art, aw, ah, 0.5, 0.3); m = Image.new('L', (aw, ah), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, aw - 1, ah - 1), radius=30, fill=255)
    im.paste(a, (ax, ay), m)
    d.rounded_rectangle((ax + 30, ay + 30, ax + 470, ay + 108), radius=14, fill=INK)
    d.ellipse((ax + 52, ay + 60, ax + 72, ay + 80), fill=REEL['red']); d.text((ax + 88, ay + 46), 'LIVE', font=F8(36), fill=WHITE)
    d.text((ax + 196, ay + 50), 'Anime Radio', font=FIG(34), fill=WHITE)
    y = ay + 560; d.rectangle((0, y, 360, y + 140), fill=HILITE); d.text((26, y + 18), 'NOW', font=F8(44), fill=INK); d.text((26, y + 72), 'PLAYING', font=F8(44), fill=INK)
    d.rectangle((360, y, W, y + 140), fill=INK)
    np_s = f'{ARTIST}, {TITLE}'; fs = 44
    while d.textlength(np_s, font=BRIC(fs)) > W - 392 - 70: fs -= 1
    d.text((392, y + 70 - fs // 2 - 4), np_s, font=BRIC(fs), fill=WHITE)
    highlight(im, lyric, (90, ay + ah - 230, W - 90, H), 66)
    d.text((60, ay + ah + 40), TITLE, font=BRIC(86), fill=WHITE); d.text((60, ay + ah + 150), ARTIST, font=FIG(52), fill=(215, 205, 225))
    d.text((60, ay + ah + 252), '0:13', font=FIG(36), fill=(225, 225, 230)); d.text((W - 150, ay + ah + 252), '1:13', font=FIG(36), fill=(225, 225, 230))
    d.rounded_rectangle((170, ay + ah + 270, W - 180, ay + ah + 280), radius=5, fill=(120, 110, 130))
    d.rounded_rectangle((170, ay + ah + 270, 170 + 140, ay + ah + 280), radius=5, fill=WHITE)
    footer(im); return im


def close(cov):
    im = grad(W, H, (40, 40, 20), (70, 20, 90), horizontal=False)
    d = ImageDraw.Draw(im)
    for k in range(7):  # the soft diagonal streaks of the Reel 1/2 close
        d.polygon([(-200 + k * 300, H), (200 + k * 300, H), (900 + k * 300, 0), (500 + k * 300, 0)], fill=(60 + 10 * (k % 2), 40, 80 + 10 * (k % 2)))
    im = im.filter(ImageFilter.GaussianBlur(30)); d = ImageDraw.Draw(im)
    lg = K._logo.resize((300, 300), Image.LANCZOS); im.paste(lg, ((W - 300) // 2, 380), lg)
    for s, f, y, c in (('GEEKFON', F8(118), 720, WHITE), ('S O C I E T Y', F8(54), 860, ORANGE)):
        tw = d.textlength(s, font=f); d.text(((W - tw) / 2, y), s, font=f, fill=c)
    f = BRIC(116); s = "Tune in. It's free."; tw = d.textlength(s, font=f); d.text(((W - tw) / 2, 1010), s, font=f, fill=WHITE)
    f = BRIC(84); s = 'geekfon.ai'; tw = d.textlength(s, font=f)
    d.rounded_rectangle(((W - tw) / 2 - 40, 1200, (W + tw) / 2 + 40, 1330), radius=18, fill=HILITE); d.text(((W - tw) / 2, 1215), s, font=f, fill=INK)
    t = cover(cov, 260, 260); d.rounded_rectangle(((W - 260) // 2 - 8, 1392, (W + 260) // 2 + 8, 1660), radius=16, fill=WHITE); im.paste(t, ((W - 260) // 2, 1400))
    f = FIG(46)
    for k, s in enumerate((f'{TITLE} by {ARTIST}.', 'Now on GeekFon radio.')):
        tw = d.textlength(s, font=f); d.text(((W - tw) / 2, 1700 + k * 62), s, font=f, fill=(235, 230, 240))
    footer(im); return im


def framed(im, s=0.82, top=190):
    """The Reel 2 v2 treatment: the whole frame at 82% with rounded corners on a soft blurred copy of itself."""
    bg = ImageEnhance.Color(ImageEnhance.Brightness(im.filter(ImageFilter.BoxBlur(40))).enhance(0.94)).enhance(1.15)
    w, h = int(round(W * s / 2)) * 2, int(round(H * s / 2)) * 2
    fg = im.resize((w, h), Image.LANCZOS); m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=34, fill=255)
    bg.paste(fg, ((W - w) // 2, top), m); return bg


# one renderer per beat: art in, full 1080x1920 frame out (the assembler passes each video frame as art)
BEATS = {
    # LoLA's intro is one continuous take in one fixed card: same colour, same box, only the caption changes
    'psst': lambda art: beat('blue', 'PSST. HEY.', art, 104, fy=0.25, lines=2),
    'stop': lambda art: beat('blue', 'STOP SCROLLING FOR ONE SECOND', art, 104, fy=0.25, lines=2),
    'question': lambda art: beat('blue', 'Do you like rock? What about anime?', art, 104, fy=0.25, lines=2),
    # the chorus: one solo per member (Sean 2026-11-19: Aoi half as long, then every member once)
    'aoi': lambda art: beat('magenta', 'Hasta la vista, goodbye for now', art, 96, plate=('AOI', 'Vocals / Guitar · Shamanic Resin'), fy=0.2),
    'vera': lambda art: beat('red', 'Hey! Hasta la vista,', art, 104, plate=('VERA', 'Keys · Shamanic Resin'), fy=0.2),
    'ren': lambda art: beat('blue', 'goodbye for now', art, 104, plate=('REN', 'Bass · Shamanic Resin'), fy=0.2),
    'momo': lambda art: beat('green', "Even if we're shaking, we're going", art, 96, plate=('MOMO', 'Drums · Shamanic Resin'), fy=0.25),
    # all four on one mic (v2, Sean 2026-11-19: "looks stupid"), replaced in v3 by the MV's glowing door
    'one-mic': lambda art: beat('magenta', "Kick the door open and go, we're here!", art, 96, plate=PLATE, fy=0.3),
    # the MV's closed door, light leaking, then the burst, cropped 9:16 (Sean 2026-11-19: "create some intrigue")
    'door': lambda art: beat('magenta', "Kick the door open and go, we're here!", art, 96, fy=0.5),
    'cover': lambda art: cover_beat('orange', 'New single', COVER_IM),
    'radio': lambda art: radio(art, "Kick the door open and go, we're here!"),
    'close': lambda art: close(COVER_IM),
}
STILL = {'psst': 'lola-hook.png', 'stop': 'lola-hook.png', 'question': 'lola-q.png', 'aoi': 'aoi.png', 'vera': 'vera.png',
         'ren': 'ren.png', 'momo': 'momo.png', 'one-mic': 'one-mic.png', 'door': 'door.png', 'radio': 'ren.png'}
post = framed

if __name__ == '__main__':
    ART_DIR, OUT, LOGO, COVER = sys.argv[1:5]
    os.makedirs(OUT, exist_ok=True); setup(ART_DIR, LOGO, COVER)
    labels = [
        ('psst', '0-1 s  LoLA: "Psst. Hey." (your Reel 1 take)'),
        ('stop', '1-3 s  LoLA: "Stop scrolling for one second."'),
        ('question', '3-7 s  LoLA (new line): "Do you like rock? What about anime?... Hold on."'),
        ('aoi', '7-10 s  Aoi starts the chorus: "Hasta la vista..."'),
        ('vera', '10-11 s  Vera solo'),
        ('ren', '11-13 s  Ren solo'),
        ('momo', '13-14 s  Momo solo: "Even if we\'re shaking, we\'re going"'),
        ('door', '14-18 s  the glowing door from the MV: "Kick the door open and go, we\'re here!"'),
        ('cover', '17-21 s  the full single cover'),
        ('radio', '21-25 s  radio, NOW PLAYING, Ren in the station art'),
        ('close', '25-30 s  the close. LoLA: "Tune in. It\'s free. geekfon.ai" (your Reel 1 take)'),
    ]
    frames = [(lab, BEATS[k](A(STILL[k]) if k in STILL else None)) for k, lab in labels]
    tw_, th_, pad = 270, 480, 12
    sheet = Image.new('RGB', (len(frames) * (tw_ + pad) + pad, th_ + 150), (24, 24, 28)); d = ImageDraw.Draw(sheet)
    d.text((pad, 10), 'REEL 3: Shamanic Resin, Hasta La Vista Maybe   (as it will post, in the Reel 2 frame)', font=FIG(22), fill=WHITE)
    for i, (label, im) in enumerate(frames):
        fr = framed(im); fr.save(os.path.join(OUT, f'reel3-{i + 1}.png')); im.save(os.path.join(OUT, f'reel3-{i + 1}-full.png'))
        x = pad + i * (tw_ + pad); sheet.paste(fr.resize((tw_, th_)), (x, 46)); yy = 46 + th_ + 10
        for ln in wrap(d, label, FIG(16), tw_):
            d.text((x, yy), ln, font=FIG(16), fill=(220, 220, 230)); yy += 21
    sheet.save(os.path.join(OUT, 'reel3-board.jpg'), quality=90)
    print('done', OUT)
