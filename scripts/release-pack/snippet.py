#!/usr/bin/env python3
"""Song snippet for the feed (Sean 2026-11-19: "give them 30-second snippets of our songs for their
different artists, and that's what should be filling our feed"). One template for every artist and song.

The launch-reel look as a radio screen: the GeekFon top bar, the station tag, the song's cover in a big
rounded card with a slow push-in, the yellow NOW PLAYING bar, the English lyric for the line being sung as
a yellow highlighter caption, title, artist and a moving progress bar, then the close ("Tune in. It's
free." geekfon.ai, cover thumb, "<title> by <artist>. Now on GeekFon radio."). Every frame gets the Reel 2
v2 82% frame, so it all sits inside the safe margins. Music only, no voice. No credits: cover art, the
song and the lyric timings only.

usage: snippet.py spec.json out.mp4
spec.json:
  {"audio": "song.mp3", "cover": "cover.png", "logo": "logo.png",
   "artist": "Roxanne", "title": "Life's Tough", "station": "Anime Radio",
   "start": 21.3, "end": 49.0, "song_seconds": 145,          # the snippet window and the song's length
   "lines": [[21.54, "Sprinting after school, shoelace comes undone"], ...],   # English line, start second
   "close_seconds": 3.6}
Line times come from Whisper on the song (sandbox), each line held until the next one starts.
"""
import json, os, subprocess, sys, tempfile
from multiprocessing import Pool

import numpy as np
from PIL import ImageFilter, ImageEnhance

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from design_kit import *
import design_kit as K

W, H, FPS = 1080, 1920, 30
S = None   # spec
_base = {}


def top_bar(im):
    d = ImageDraw.Draw(im); d.rectangle((0, 0, W, 150), fill=INK)
    lg = K._logo.resize((84, 84), Image.LANCZOS); im.paste(lg, (48, 33), lg)
    d.text((144, 30), 'GEEKFON', font=F8(44), fill=WHITE); d.text((147, 82), 'S O C I E T Y', font=F8(19), fill=ORANGE)
    f = F8(30); tw = d.textlength('LIVE', font=f); d.text((W - 52 - tw, 58), 'LIVE', font=f, fill=WHITE)
    d.ellipse((W - 52 - tw - 34, 66, W - 52 - tw - 16, 84), fill=REEL['red'])


def footer(im):
    d = ImageDraw.Draw(im); f = FIG(28); s = 'AI artists · voices performed by the founder'; tw = d.textlength(s, font=f)
    d.rounded_rectangle((W - 40 - tw - 32, H - 76, W - 40, H - 28), radius=10, fill=(30, 18, 40)); d.text((W - 40 - tw - 16, H - 70), s, font=f, fill=WHITE)


def framed_parts(im, s=0.82, top=190):
    """The Reel 2 v2 frame, split so the blurred surround is made once and only the 82% copy is per frame."""
    bg = ImageEnhance.Color(ImageEnhance.Brightness(im.filter(ImageFilter.BoxBlur(40))).enhance(0.94)).enhance(1.15)
    w, h = int(round(W * s / 2)) * 2, int(round(H * s / 2)) * 2
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=34, fill=255)
    return bg, (w, h), m, ((W - w) // 2, top)


def mmss(t):
    t = int(round(t)); return f'{t // 60}:{t % 60:02d}'


AX, AY, AS = 60, 300, 960   # the cover card


def player_base():
    """Everything on the player screen that does not move."""
    cov = Image.open(S['cover']).convert('RGB')
    bg = cov.resize((H, H)).crop(((H - W) // 2, 0, (H - W) // 2 + W, H)).filter(ImageFilter.GaussianBlur(50))
    bg = ImageEnhance.Brightness(bg).enhance(0.42)
    im = Image.blend(bg, grad(W, H, (110, 60, 30), (30, 50, 110), horizontal=False), 0.4); top_bar(im)
    d = ImageDraw.Draw(im)
    # station tag
    s = S.get('station', 'GeekFon Radio'); f = FIG(34); tw = d.textlength(s, font=f)
    lw = d.textlength('LIVE', font=F8(32)); sx = AX + 58 + lw + 22
    d.rounded_rectangle((AX, 186, sx + tw + 28, 262), radius=16, fill=INK)
    d.ellipse((AX + 24, 214, AX + 44, 234), fill=REEL['red']); d.text((AX + 58, 200), 'LIVE', font=F8(32), fill=WHITE)
    d.text((sx, 204), s, font=f, fill=WHITE)
    # card shadow
    d.rounded_rectangle((AX + 16, AY + 16, AX + AS + 16, AY + AS + 16), radius=34, fill=INK)
    # NOW PLAYING bar
    y = AY + AS + 30
    d.rectangle((0, y, 360, y + 120), fill=HILITE); d.text((26, y + 10), 'NOW', font=F8(42), fill=INK); d.text((26, y + 60), 'PLAYING', font=F8(42), fill=INK)
    d.rectangle((360, y, W, y + 120), fill=INK)
    np_s = f"{S['artist']}, {S['title']}"; fs = 46
    while d.textlength(np_s, font=BRIC(fs)) > W - 392 - 50: fs -= 1
    d.text((392, y + 60 - fs // 2 - 4), np_s, font=BRIC(fs), fill=WHITE)
    # title, artist
    y2 = y + 150; ft = 86
    while d.textlength(S['title'], font=BRIC(ft)) > W - 120: ft -= 2
    d.text((60, y2), S['title'], font=BRIC(ft), fill=WHITE); d.text((60, y2 + ft + 14), S['artist'], font=FIG(52), fill=(215, 205, 225))
    footer(im)
    return im, cov, y2 + ft + 100


def balanced(d, s, f, l, r, pad):
    """The narrowest centred box that keeps the same number of lines, so no word sits alone on a line."""
    n = len(wrap(d, s, f, r - l - 2 * pad)); w = r - l
    while w > 200 and len(wrap(d, s, f, w - 20 - 2 * pad)) == n:
        w -= 20
    c = (l + r) // 2; return c - w // 2, c + w // 2


def player_frame(t):
    """The player at song second t."""
    im, cov, py = _base['player']; im = im.copy(); d = ImageDraw.Draw(im)
    # slow push-in on the cover over the snippet
    k = (t - S['start']) / max(0.1, S['end'] - S['start']); z = 1.0 + 0.07 * min(1, max(0, k))
    a = cover(cov, int(AS * z), int(AS * z)); off = int((a.width - AS) / 2); a = a.crop((off, off, off + AS, off + AS))
    im.paste(a, (AX, AY), _base['mask'])
    # the lyric being sung
    line = None
    for st, s in S['lines']:
        if t >= st - 0.08: line = s
    if line and t <= S['lines'][-1][0] + 6:
        l, r = balanced(d, line, BRIC(64), 90, W - 90, int(64 * 0.22))
        highlight(im, line, (l, AY + AS - 250, r, H), 64)
    # progress
    total = S['song_seconds']; fr = min(1, max(0, t / total))
    d.text((60, py), mmss(t), font=FIG(36), fill=(225, 225, 230)); d.text((W - 150, py), mmss(total), font=FIG(36), fill=(225, 225, 230))
    x0, x1 = 170, W - 180
    d.rounded_rectangle((x0, py + 18, x1, py + 28), radius=5, fill=(120, 110, 130))
    d.rounded_rectangle((x0, py + 18, x0 + max(12, int((x1 - x0) * fr)), py + 28), radius=5, fill=WHITE)
    d.ellipse((x0 + int((x1 - x0) * fr) - 13, py + 10, x0 + int((x1 - x0) * fr) + 13, py + 36), fill=WHITE)
    return im


def close_frame():
    im = grad(W, H, (40, 40, 20), (70, 20, 90), horizontal=False); d = ImageDraw.Draw(im)
    for k in range(7):
        d.polygon([(-200 + k * 300, H), (200 + k * 300, H), (900 + k * 300, 0), (500 + k * 300, 0)], fill=(60 + 10 * (k % 2), 40, 80 + 10 * (k % 2)))
    im = im.filter(ImageFilter.GaussianBlur(30)); d = ImageDraw.Draw(im)
    lg = K._logo.resize((300, 300), Image.LANCZOS); im.paste(lg, ((W - 300) // 2, 380), lg)
    for s, f, y, c in (('GEEKFON', F8(118), 720, WHITE), ('S O C I E T Y', F8(54), 860, ORANGE)):
        tw = d.textlength(s, font=f); d.text(((W - tw) / 2, y), s, font=f, fill=c)
    f = BRIC(116); s = "Tune in. It's free."; tw = d.textlength(s, font=f); d.text(((W - tw) / 2, 1010), s, font=f, fill=WHITE)
    f = BRIC(84); s = 'geekfon.ai'; tw = d.textlength(s, font=f)
    d.rounded_rectangle(((W - tw) / 2 - 40, 1200, (W + tw) / 2 + 40, 1330), radius=18, fill=HILITE); d.text(((W - tw) / 2, 1215), s, font=f, fill=INK)
    t = cover(Image.open(S['cover']).convert('RGB'), 260, 260)
    d.rounded_rectangle(((W - 260) // 2 - 8, 1392, (W + 260) // 2 + 8, 1660), radius=16, fill=WHITE); im.paste(t, ((W - 260) // 2, 1400))
    f = FIG(46)
    for k, s in enumerate((f"{S['title']} by {S['artist']}.", 'Now on GeekFon radio.')):
        fs = 46
        while d.textlength(s, font=FIG(fs)) > W - 120: fs -= 2
        tw = d.textlength(s, font=FIG(fs)); d.text(((W - tw) / 2, 1700 + k * 62), s, font=FIG(fs), fill=(235, 230, 240))
    footer(im); return im


def _init(spec):
    global S
    S = spec; set_logo(S['logo'])
    m = Image.new('L', (AS, AS), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, AS - 1, AS - 1), radius=30, fill=255); _base['mask'] = m
    _base['player'] = player_base()
    bg, size, fm, pos = framed_parts(player_frame(S['start'])); _base['frame'] = (bg, size, fm, pos)
    cbg, _, _, _ = framed_parts(close_frame()); _base['close_bg'] = cbg; _base['close'] = close_frame()


def _render(job):
    kind, t = job
    if kind == 'close':
        im, bg = _base['close'], _base['close_bg']
    else:
        im, bg = player_frame(t), _base['frame'][0]
    _, size, fm, pos = _base['frame']
    out = bg.copy(); out.paste(im.resize(size, Image.LANCZOS), pos, fm)
    return np.asarray(out.convert('RGB')).tobytes()


def main(spec_path, out):
    spec = json.load(open(spec_path)); base = os.path.dirname(os.path.abspath(spec_path))
    for k in ('audio', 'cover', 'logo'):
        if not os.path.isabs(spec[k]) and '://' not in spec[k]: spec[k] = os.path.join(base, spec[k])
    st, en, cl = spec['start'], spec['end'], spec.get('close_seconds', 3.6)
    snip = en - st; total = snip + cl
    jobs = [('player', st + i / FPS) for i in range(round(snip * FPS))] + [('close', 0)] * round(cl * FPS)
    tmp = tempfile.mkdtemp(prefix='snip-'); video = os.path.join(tmp, 'v.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', video], stdin=subprocess.PIPE)
    with Pool(max(1, os.cpu_count() - 1), initializer=_init, initargs=(spec,)) as pool:
        for buf in pool.imap(_render, jobs, chunksize=6):
            enc.stdin.write(buf)
    enc.stdin.close(); enc.wait()
    # the song from the snippet start, faded in, carried under the close and faded out
    af = f'afade=t=in:d=0.35,afade=t=out:st={snip + 0.4:.2f}:d={cl - 0.5:.2f},loudnorm=I=-16:TP=-1.5:LRA=11'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-ss', f'{st:.3f}', '-t', f'{total:.3f}', '-i', spec['audio'],
                    '-map', '0:v', '-map', '1:a', '-af', af, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-t', f'{total:.3f}', '-movflags', '+faststart', out], check=True)
    print(out, f'{total:.2f} s')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
