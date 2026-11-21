#!/usr/bin/env python3
"""Artist song preview for the feed (Sean 2026-11-21): "just the artist playing", like the Roxanne and
Straight & Narrow beats in Reels 1 and 2, but no LoLA and no pitch. The song starts on the first frame;
the artist is on screen in the launch-reel look (halftone colour field, LIVE bar, yellow highlighter
lyric, art in a black-bordered card, name plate), then the same close as the radio snippets ("Tune in.
It's free." geekfon.ai). 30-35 s. Music only, no voice, no credits: approved portraits, the song and the
lyric timings. The 80% of the feed (canon: the 80/20 feed mix); snippet.py's radio screen is the other look.

usage: artist_preview.py spec.json out.mp4
spec.json = a snippet spec (audio, cover, logo, artist, title, start, end, song_seconds, lines, close_seconds)
  plus "art": ["music.png", "support-v2.png"]   approved portraits, cut on lyric changes
       "color": "magenta"                        a design_kit REEL colour
       "plate_tag": "J-Pop Rock · Tokyo"         under the artist name (default: the song title)
       "art_box": [0.14, 0.02, 0.86, 0.66]       the part of each portrait to frame (fractions l, t, r, b)
"""
import json, os, subprocess, sys, tempfile
from multiprocessing import Pool

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from design_kit import *
import design_kit as K
import snippet as SN

W, H, FPS = 1080, 1920, 30
S = None
_b = {}
CAP_Y, CAP_SIZE, CAP_LINES = 200, 88, 2
CW = 740


def _ground():
    g = halftone(W, H, REEL[S.get('color', 'blue')]); SN.top_bar(g); return g


def _art_index(t):
    """Which portrait is up: the art list is spread over the lyric lines and cuts on a line change."""
    n = len(_b['art']); lines = S['lines']
    if n == 1 or not lines: return 0
    per = -(-len(lines) // n)
    i = 0
    for k, (st, _) in enumerate(lines):
        if t >= st - 0.08: i = k
    return min(n - 1, i // per)


def frame(t):
    im = _b['ground'].copy(); d = ImageDraw.Draw(im)
    line = None
    for st, s in S['lines']:
        if t >= st - 0.08: line = s
    if line and t <= S['lines'][-1][0] + 6:
        size = CAP_SIZE   # shrink a long line until it fits the two-line caption area
        while size > 56 and len(wrap(d, line, BRIC(size), W - 120 - 2 * int(size * 0.22))) > CAP_LINES: size -= 4
        n = len(wrap(d, line, BRIC(size), W - 120 - 2 * int(size * 0.22)))
        cap_h = CAP_LINES * CAP_SIZE * 1.18
        highlight(im, line, (60, CAP_Y + (cap_h - n * size * 1.18) / 2, W - 60, H), size)
    y = int(CAP_Y + CAP_LINES * CAP_SIZE * 1.18) + 60
    ch = H - 300 - y
    # slow push-in across the whole preview
    k = (t - S['start']) / max(0.1, S['end'] - S['start']); z = 1.0 + 0.08 * min(1, max(0, k))
    art = _b['art'][_art_index(t)]; aw, ah = art.size
    cw_, chh = int(aw / z), int(ah / z); ox, oy = (aw - cw_) // 2, int((ah - chh) * 0.25)
    card(im, art.crop((ox, oy, ox + cw_, oy + chh)), ((W - CW) // 2, y, (W + CW) // 2, y + ch), fy=S.get('fy', 0.2), border=12, shadow=18)
    name_plate(im, S['artist'].upper(), S.get('plate_tag') or S['title'], (W - CW) // 2 - 30, y + ch - 140, size=58)
    SN.footer(im)
    return im


def _init(spec):
    global S
    S = spec; SN.S = spec; set_logo(S['logo'])
    _b['art'] = [Image.open(p).convert('RGB') for p in S['art']]
    # full-body portraits on white: frame head to thigh (frac box l, t, r, b), as the Reel 1/2 beats are framed
    fb = S.get('art_box', [0.14, 0.02, 0.86, 0.66])
    _b['art'] = [a.crop((int(a.width * fb[0]), int(a.height * fb[1]), int(a.width * fb[2]), int(a.height * fb[3]))) for a in _b['art']]
    for i, a in enumerate(_b['art']):   # keep frames cheap: the card is ~740 px wide
        if a.width > 1400: _b['art'][i] = a.resize((1400, int(a.height * 1400 / a.width)), Image.LANCZOS)
    _b['ground'] = _ground()
    bg, size, fm, pos = SN.framed_parts(frame(S['start'])); _b['frame'] = (size, fm, pos)
    _b['bg'] = bg
    cbg, _, _, _ = SN.framed_parts(SN.close_frame()); _b['close_bg'] = cbg; _b['close'] = SN.close_frame()


def _render(job):
    kind, t = job
    if kind == 'close':
        im, bg = _b['close'], _b['close_bg']
    else:
        im, bg = frame(t), _b['bg']
    size, fm, pos = _b['frame']
    out = bg.copy(); out.paste(im.resize(size, Image.LANCZOS), pos, fm)
    return np.asarray(out.convert('RGB')).tobytes()


def main(spec_path, out):
    spec = json.load(open(spec_path)); base = os.path.dirname(os.path.abspath(spec_path))
    rel = lambda p: p if (os.path.isabs(p) or '://' in p) else os.path.join(base, p)
    for k in ('audio', 'cover', 'logo'): spec[k] = rel(spec[k])
    spec['art'] = [rel(p) for p in spec['art']]
    st, en, cl = spec['start'], spec['end'], spec.get('close_seconds', 3.6)
    snip = en - st; total = snip + cl
    jobs = [('art', st + i / FPS) for i in range(round(snip * FPS))] + [('close', 0)] * round(cl * FPS)
    tmp = tempfile.mkdtemp(prefix='prev-'); video = os.path.join(tmp, 'v.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', video], stdin=subprocess.PIPE)
    with Pool(max(1, os.cpu_count() - 1), initializer=_init, initargs=(spec,)) as pool:
        for buf in pool.imap(_render, jobs, chunksize=6):
            enc.stdin.write(buf)
    enc.stdin.close(); enc.wait()
    af = f'afade=t=in:d=0.25,afade=t=out:st={snip + 0.4:.2f}:d={cl - 0.5:.2f},loudnorm=I=-16:TP=-1.5:LRA=11'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-ss', f'{st:.3f}', '-t', f'{total:.3f}', '-i', spec['audio'],
                    '-map', '0:v', '-map', '1:a', '-af', af, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-t', f'{total:.3f}', '-movflags', '+faststart', out], check=True)
    print(out, f'{total:.2f} s')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
