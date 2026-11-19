#!/usr/bin/env python3
"""Designed art for Shamanic Resin - Hasta La Vista Maybe, in the REEL LOOK of the
GeekFon launch-week reels (design_kit.py): the two LoLA teaser storyboards (one
frame per beat), the Reel cover, and three YouTube thumbnail options. Everything
that matters sits inside the safe area. Nothing meant to post before MV day shows
the doorway reveal: those pieces use studio shots.

usage: python3 releases/shamanic-resin-hasta-la-vista-maybe.design.py SRC OUT LOGO
  SRC: mv.mp4, asta-freeze-full-v1.mp4, stills/ (MV storyboard stills),
       teaser/t1.png and teaser/t2.png (the approved LoLA stills, 9:16)
  OUT: frames, boards and options (a proof copy of each with the safe area in red)
"""
import os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from design_kit import *

SRC, OUT, LOGO = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True); set_logo(LOGO)
P = lambda *a: os.path.join(SRC, *a)


def mv(t, path=None, src='mv.mp4'):
    out = os.path.join(OUT, f'_{os.path.basename(src)}-{t}.png')
    if not os.path.exists(out):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', P(src), '-frames:v', '1', out], check=True)
    return Image.open(out).convert('RGB')


SW, SH = 1080, 1920
SAFE = (90, 250, 930, 1480)        # matches slots.json teaser / cut_hook_916 safe area
PANEL = (120, 250, 960, 1480)      # the white panel: centred, its content (inset 30) stays inside SAFE
TITLE = 'Hasta La Vista Maybe'


def reel_frame(color, headline, art, kind='portrait', fx=0.5, fy=0.35, plate=None):
    im = halftone(SW, SH, REEL[color]); l, t, r, b = panel(im, PANEL, inset=30)
    live_bar(im, (l, t, r, t + 90))
    y = highlight(im, headline, (l, t + 116, r, b), 76) + 30
    foot = b - 52
    ai_line(im, (l + r) // 2, foot)
    room_b = foot - 30
    if kind == 'portrait':
        h = room_b - y; w = min(r - l - 40, int(h * 0.74)); x0 = (l + r - w) // 2
        card(im, art, (x0, y, x0 + w, room_b - 16), fx=fx, fy=fy)
    else:  # wide MV frame
        w = r - l - 16; h = int(w * 9 / 16); y0 = y + max(0, (room_b - y - h) // 2 - 20); x0 = l
        card(im, art, (x0, y0, x0 + w, y0 + h))
        room_b = y0 + h
    if plate:
        name_plate(im, plate[0], plate[1], l + 16, room_b - 150, size=54)
    return im


def end_card(color, lines, art, plate, url=None):
    im = halftone(SW, SH, REEL[color]); l, t, r, b = panel(im, PANEL, inset=30)
    live_bar(im, (l, t, r, t + 90))
    y = t + 120
    for s, size in lines:
        y = highlight(im, s, (l, y, r, b), size) + 14
    w = r - l - 16; h = int(w * 9 / 16); y0 = y + 26
    card(im, art, (l, y0, l + w, y0 + h))
    name_plate(im, plate[0], plate[1], l + 16, y0 + h - 110, size=50)
    d = ImageDraw.Draw(im)
    if url:
        f = BRIC(62); tw = d.textlength(url, font=f); yy = y0 + h + 44; cx = (l + r) / 2
        d.rounded_rectangle((cx - tw / 2 - 26, yy, cx + tw / 2 + 26, yy + 86), radius=18, fill=INK)
        d.text((cx - tw / 2, yy + 6), url, font=f, fill=HILITE)
    ai_line(im, (l + r) // 2, b - 52)
    return im


def with_safe(im, box):
    im = im.copy(); ImageDraw.Draw(im).rectangle(box, outline=(255, 0, 0), width=4); return im


def board(name, frames, proof=False):
    tw, th, pad = 324, 576, 16
    sheet = Image.new('RGB', (len(frames) * (tw + pad) + pad, th + 150), (24, 24, 28)); d = ImageDraw.Draw(sheet)
    head = 'red line = safe area' if proof else 'as it will post: the white panel is the safe area'
    d.text((pad, 10), f'{name.upper()}   {head}', font=FIG(22), fill=WHITE)
    for i, (label, im) in enumerate(frames):
        x = pad + i * (tw + pad); sheet.paste((with_safe(im, SAFE) if proof else im).resize((tw, th)), (x, 46)); yy = 46 + th + 10
        for ln in wrap(d, label, FIG(17), tw):
            d.text((x, yy), ln, font=FIG(17), fill=(220, 220, 230)); yy += 22
        im.save(os.path.join(OUT, f'{name}-{i + 1}.png'))
        if not proof:
            import json
            cj = os.path.join(OUT, 'cards.json'); data = json.load(open(cj)) if os.path.exists(cj) else {}
            data[f'{name}-{i + 1}'] = im.info.get('cards', []); json.dump(data, open(cj, 'w'), indent=1)
    sheet.save(os.path.join(OUT, f'{name}-board{"-proof" if proof else ""}.jpg'), quality=90)
    if not proof:
        board(name, frames, proof=True)


lola1 = Image.open(P('teaser', 't1.png')).convert('RGB')
lola2 = Image.open(P('teaser', 't2.png')).convert('RGB')
studio = mv(0.5); door = mv(29); straining = Image.open(P('stills', 'door-straining-db4.png')).convert('RGB')
aoi = mv(14.0); momo = mv(16.5); vera = mv(10.0); ren = mv(6.0)
# the four directors' pitch boards (MV pitch 2026-11), 2x2: the weeks of work, no reveal
compare = Image.new('RGB', (1920, 1080), INK)
for k, n in enumerate(('1-freeze', '2-paint-bomb', '3-lights-out', '4-blank-page')):
    pb = Image.open(P('pitch', n + '.jpg')).convert('RGB').resize((950, 535))
    compare.paste(pb, ((k % 2) * 970, (k // 2) * 545))

board('teaser-1', [
    ('0-4 s  LoLA to camera: "Hi, it\'s LoLA. Shamanic Resin used to sing with their breath held, in a tiny room."',
     reel_frame('magenta', "Hi, it's LoLA.", lola1, fy=0.22)),
    ('4-7 s  cut-away, frozen on the beat: the band in the tiny studio (MV 0:00). "That\'s about to change."',
     reel_frame('orange', 'They used to sing with their breath held.', studio, kind='wide', plate=('SHAMANIC RESIN', 'Rock · GeekFon Society'))),
    ('7-11 s  LoLA: "The new single is called Hasta La Vista Maybe."',
     reel_frame('magenta', f'New single: {TITLE}', lola1, fy=0.22)),
    ('11-13 s  cut-away: the closed door, light at the edges (MV 0:29). "The door is about to open."',
     reel_frame('blue', 'The door is about to open.', door, kind='wide')),
    ('13-15 s  end card. LoLA: "Stay close."',
     end_card('pink', [(TITLE, 84), ('Stay close.', 64)], studio, ('SHAMANIC RESIN', 'New single · GeekFon Society'))),
])
board('teaser-2', [
    ('0-4 s  LoLA to camera: "LoLA again. Weeks of work went into the Hasta La Vista Maybe video,"',
     reel_frame('green', 'LoLA again.', lola2, fy=0.22)),
    ('4-8 s  cut-away: the pitch boards from the four directors who pitched this video. "and GeekFon members get to watch it come together first:"',
     reel_frame('magenta', 'Weeks of work went into this video.', compare, kind='wide')),
    ('8-11 s  cut-away: a storyboard frame, the door straining (no reveal). "the storyboards, the early cuts, all of it."',
     reel_frame('orange', 'Storyboards. Early cuts. All of it.', straining, kind='wide')),
    ('11-13 s  LoLA: "Join at geekfon.ai and see how it was made."',
     reel_frame('green', 'Members see how it was made first.', lola2, fy=0.22)),
    ('13-15 s  end card',
     end_card('blue', [('The making of.', 84), ('Members first.', 84)], straining, ('SHAMANIC RESIN', TITLE), url='geekfon.ai')),
])

# Reel cover for the 9:16 cuts: studio shot (no reveal), title and faces inside the 3:4 grid crop
cover_im = halftone(SW, SH, REEL['magenta'])
COVER_SAFE = (90, 250, 990, 1670)  # side margins + Instagram's 3:4 grid crop
cl, ct, cr, cb = panel(cover_im, COVER_SAFE)
live_bar(cover_im, (cl, ct, cr, ct + 96))
yb = highlight(cover_im, TITLE, (cl, ct + 150, cr, cb), 112) + 60
w = cr - cl - 16; h = int(w * 9 / 16); yb = max(yb, (ct + cb - h) // 2 + 60)
card(cover_im, studio, (cl, yb, cl + w, yb + h))
name_plate(cover_im, 'SHAMANIC RESIN', 'Rock · GeekFon Society', cl + 14, yb + h - 130, size=58)
ai_line(cover_im, (cl + cr) // 2, cb - 56)
cover_im.save(os.path.join(OUT, 'reel-cover.jpg'), quality=92)
cover_im.resize((405, 720)).save(os.path.join(OUT, 'reel-cover-preview.jpg'), quality=90)
with_safe(cover_im, COVER_SAFE).resize((405, 720)).save(os.path.join(OUT, 'reel-cover-proof.jpg'), quality=90)

# YouTube thumbnails 1280x720, safe 40 px sides and top, 90 px bottom (timestamp badge)
TW, TH = 1280, 720; TS = (40, 40, 1240, 630)


def thumb(color):
    return halftone(TW, TH, REEL[color])


A = thumb('magenta'); card(A, Image.open(P('stills', 'ending-860-band-doorway-hardcel.png')).convert('RGB'), (52, 60, 712, 431 + 100), fx=0.45)
name_plate(A, 'SHAMANIC RESIN', 'Official Music Video', 64, 470, size=46)
highlight(A, 'Hasta La', (740, 120, 1240, 630), 104); highlight(A, 'Vista', (740, 248, 1240, 630), 104); highlight(A, 'Maybe', (740, 376, 1240, 630), 104)
live_bar(A, (760, 520, 1220, 600), live=False)

B = thumb('orange'); card(B, aoi, (640, 52, 1228, 610), fx=0.62, fy=0.35)
for k, (s, y) in enumerate((('HASTA LA', 90), ('VISTA', 218), ('MAYBE', 346))):
    highlight(B, s, (40, y, 640, 630), 110)
name_plate(B, 'SHAMANIC RESIN', 'Official Music Video', 52, 488, size=44)

C = thumb('blue')
for k, (fr, x, fx) in enumerate(((aoi, 52, 0.62), (momo, 342, 0.62), (vera, 632, 0.42), (ren, 922, 0.42))):
    card(C, fr, (x, 62, x + 270, 62 + 340), fx=fx, fy=0.3, border=8, shadow=10)
highlight(C, TITLE, (40, 436, 1240, 630), 82)
name_plate(C, 'SHAMANIC RESIN', 'Official Music Video', 52, 540, size=36)

sheet = Image.new('RGB', (3 * 650 + 30, 520), (30, 30, 30)); sd = ImageDraw.Draw(sheet)
for i, (k, o) in enumerate((('A', A), ('B', B), ('C', C))):
    o.save(os.path.join(OUT, f'yt-{k}.jpg'), quality=92)
    pr = o.copy(); ImageDraw.Draw(pr).rectangle(TS, outline=(255, 0, 0), width=3)
    sheet.paste(pr.resize((640, 360)), (10 + i * 655, 10)); sheet.paste(o.resize((168, 94)), (10 + i * 655, 390))
    sd.text((190 + i * 655, 420), f'{k}  (actual size in the YouTube list)', font=FIG(18), fill=WHITE)
sheet.save(os.path.join(OUT, 'thumb-options.jpg'), quality=92)
print('done', OUT)
