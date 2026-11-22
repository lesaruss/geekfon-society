#!/usr/bin/env python3
"""GeekFon Christmas commercial: retro late-night TV ad assembler (teaser and full cut).

Canon: decision-geekfon-holiday-drops-2026 (script, v6 song slots), canon-geekfon-performance-video
(singing faces short, candids carry the rest), canon-geekfon-release-pack (safe zones, AI line, loudness).

Free work only (Pillow + ffmpeg). Run where the inputs are (the Higgsfield sandbox):

    python3 xmas_commercial.py plan.json out.mp4

plan.json holds the sources and the timeline:
  {"size": [1080, 1920], "fps": 30, "duration": 15.0,
   "fonts": {"bold": "/path/Montserrat-ExtraBold.ttf"},
   "logo": "logo.png", "cover": "cover.jpg",
   "safe": {"l": 90, "r": 150, "t": 250, "b": 440},
   "ai_line": "AI artists · songs written and produced by our founder",
   "shots": [ {"t0": 0, "t1": 2.6, "card": "title", "text": "This holiday season..."},
              {"t0": 2.6, "t1": 6.4, "card": "logo", "text": "GeekFon Christmas"},
              {"t0": 6.4, "t1": 7.3, "clip": "m1.mp4", "ss": 0.3, "bar": ["Así, Así", "Nilo Wave feat. Likkle Sis"]},
              {"t0": 12.6, "t1": 15.0, "card": "end", "lines": ["OUT MONDAY", "NOV 30"], "sub": "geekfon.ai"} ],
   "audio": [ {"src": "season.mp3", "at": 0.15, "gain_db": 0},
              {"src": "asi.mp3", "at": 2.6, "ss": 74.5, "dur": 5.5, "gain_db": 0, "duck": [[2.6, 6.4, -14]]} ],
   "statics": [2.6, 6.4, 12.6]}

Every bar, card text and the AI line is drawn inside the safe area. VHS look (scanlines, chroma shift,
grain, a soft vignette) goes over everything; a 0.12 s static burst marks each card change.
"""
import json, math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter

INK = (14, 10, 22); YEL = (255, 214, 40); WHITE = (255, 255, 255); RED = (200, 16, 36); DEEP = (32, 0, 58)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'ffmpeg failed: {" ".join(cmd[:6])} ...\n{r.stderr[-2000:]}')


def font(p, s):
    return ImageFont.truetype(p, s)


def chrome_text(im, text, f, cx, y, stroke=8):
    """Chrome-and-gold title type with a black outline and a glow, centred on cx. Returns its height."""
    d = ImageDraw.Draw(im); l, t, r, b = d.textbbox((0, 0), text, font=f, stroke_width=stroke)
    w, h = r - l, b - t
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).text((-l, -t), text, font=f, fill=255)
    o = Image.new('L', (w, h), 0); ImageDraw.Draw(o).text((-l, -t), text, font=f, fill=255, stroke_width=stroke, stroke_fill=255)
    grad = Image.new('RGB', (w, h)); g = ImageDraw.Draw(grad)
    stops = [(0, (255, 250, 220)), (0.45, (255, 205, 60)), (0.55, (190, 120, 20)), (1, (255, 236, 150))]
    for yy in range(h):
        p = yy / max(h - 1, 1)
        for (a, ca), (bb, cb) in zip(stops, stops[1:]):
            if a <= p <= bb:
                k = (p - a) / (bb - a); g.line([(0, yy), (w, yy)], fill=tuple(int(ca[i] + (cb[i] - ca[i]) * k) for i in range(3)))
                break
    x = int(cx - w / 2)
    glow = Image.new('RGBA', (w + 80, h + 80), (0, 0, 0, 0)); gl = Image.new('L', (w + 80, h + 80), 0); gl.paste(o, (40, 40))
    glow.putalpha(gl.filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.7)))
    glow = Image.composite(Image.new('RGBA', glow.size, (255, 200, 80, 255)), glow, glow.getchannel('A'))
    im.alpha_composite(glow, (x - 40, y - 40))
    im.paste(Image.new('RGBA', (w, h), INK + (255,)), (x, y), o)
    im.paste(grad, (x, y), m)
    return h


def sparkles(im, n, seed, box):
    import random
    rnd = random.Random(seed); d = ImageDraw.Draw(im); l, t, r, b = box
    for _ in range(n):
        x, y, s = rnd.randint(l, r), rnd.randint(t, b), rnd.choice([3, 4, 6, 9])
        c = rnd.choice([(255, 236, 150), WHITE, (255, 205, 60)])
        d.line([(x - s, y), (x + s, y)], fill=c, width=2); d.line([(x, y - s), (x, y + s)], fill=c, width=2)


def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    return lines + [cur]


def card_title(P, sh, path):
    W, H = P['size']; s = P['safe']; im = Image.new('RGBA', (W, H), DEEP + (255,))
    sparkles(im, 140, 7, (0, 0, W, H))
    f = font(P['fonts']['bold'], 120); d = ImageDraw.Draw(im)
    lines = wrap(d, sh['text'], f, W - s['l'] - s['r'] - 40)
    y = (s['t'] + (H - s['b'])) // 2 - len(lines) * 75
    cx = (s['l'] + W - s['r']) // 2
    for ln in lines:
        y += chrome_text(im, ln, f, cx, y) + 20
    im.convert('RGB').save(path)


def card_logo_frames(P, sh, d0, fps):
    """Logo spin: the logo turns on its vertical axis twice and settles, the title fades up under it."""
    W, H = P['size']; s = P['safe']; n = int(round((sh['t1'] - sh['t0']) * fps))
    logo = Image.open(P['logo']).convert('RGBA'); L = 520; logo = logo.resize((L, L), Image.LANCZOS)
    base = Image.new('RGBA', (W, H), RED + (255,)); sparkles(base, 160, 11, (0, 0, W, H))
    cx = (s['l'] + W - s['r']) // 2; ly = s['t'] + 120
    title = Image.new('RGBA', (W, H), (0, 0, 0, 0)); f = font(P['fonts']['bold'], 132); dd = ImageDraw.Draw(title)
    y = ly + L + 70
    for ln in wrap(dd, sh['text'], f, W - s['l'] - s['r'] - 40):
        y += chrome_text(title, ln, f, cx, y) + 16
    spin_n = int(n * 0.45)
    for i in range(n):
        im = base.copy()
        if i < spin_n:
            a = (i / spin_n) * 4 * math.pi; sx = max(abs(math.cos(a)), 0.04)
        else:
            sx = 1.0
        lw = max(int(L * sx), 2); lg = logo.resize((lw, L), Image.LANCZOS)
        im.alpha_composite(lg, (cx - lw // 2, ly))
        k = min(max((i - spin_n * 0.8) / (fps * 0.4), 0), 1)
        if k > 0:
            t2 = title.copy(); t2.putalpha(title.getchannel('A').point(lambda v: int(v * k))); im.alpha_composite(t2)
        im.convert('RGB').save(os.path.join(d0, f'{i:04d}.png'))
    return n


def card_end(P, sh, path):
    W, H = P['size']; s = P['safe']; im = Image.new('RGBA', (W, H), DEEP + (255,)); sparkles(im, 120, 23, (0, 0, W, H))
    d = ImageDraw.Draw(im); cx = (s['l'] + W - s['r']) // 2; cw = W - s['l'] - s['r'] - 180
    cov = Image.open(P['cover']).convert('RGB').resize((cw, cw), Image.LANCZOS)
    x0, y0 = cx - cw // 2, s['t'] + 10
    d.rounded_rectangle((x0 + 14, y0 + 14, x0 + cw + 14 + 20, y0 + cw + 14 + 20), radius=26, fill=INK)
    d.rounded_rectangle((x0, y0, x0 + cw + 20, y0 + cw + 20), radius=26, fill=WHITE)
    im.paste(cov, (x0 + 10, y0 + 10))
    y = y0 + cw + 60
    f = font(P['fonts']['bold'], 104)
    for ln in sh['lines']:
        y += chrome_text(im, ln, f, cx, y, stroke=7) + 14
    if sh.get('sub'):
        fs = font(P['fonts']['bold'], 52); tw = d.textlength(sh['sub'], font=fs)
        d.rounded_rectangle((cx - tw / 2 - 26, y + 10, cx + tw / 2 + 26, y + 10 + 80), radius=14, fill=YEL)
        d.text((cx - tw / 2, y + 22), sh['sub'], font=fs, fill=INK)
    im.convert('RGB').save(path)


def card_cover(P, sh, path):
    """Clean end card (no VHS): the real album cover on its own red, with the call to action under it."""
    W, H = P['size']; s = P['safe']; bg = tuple(sh.get('bg', [212, 20, 48]))
    im = Image.new('RGBA', (W, H), bg + (255,)); d = ImageDraw.Draw(im)
    cx = (s['l'] + W - s['r']) // 2; cw = sh.get('cover_w', 780)
    cov = Image.open(P['cover']).convert('RGB').resize((cw, cw), Image.LANCZOS)
    y0 = s['t'] + sh.get('cover_top', 40); im.paste(cov, (cx - cw // 2, y0))
    y = y0 + cw + 50; maxw = W - s['l'] - s['r'] - 20
    for ln in sh.get('lines', []):
        f = font(P['fonts']['bold'], 76)
        while d.textlength(ln, font=f) > maxw and f.size > 30:   # fit inside the safe width (v1 ran off the edge)
            f = font(P['fonts']['bold'], f.size - 2)
        tw = d.textlength(ln, font=f); d.text((cx - tw / 2, y), ln, font=f, fill=WHITE); y += int(f.size * 1.2)
    if sh.get('sub'):
        fs = font(P['fonts']['bold'], 46); tw = d.textlength(sh['sub'], font=fs)
        d.rounded_rectangle((cx - tw / 2 - 26, y + 14, cx + tw / 2 + 26, y + 14 + 72), radius=14, fill=YEL)
        d.text((cx - tw / 2, y + 24), sh['sub'], font=fs, fill=INK)
    im.convert('RGB').save(path)


def cover_zoom_frames(P, sh, d0, fps, dur):
    """End card that starts as the full-frame cover (matching the last frame of the morph), eases back into the
    card position, then fades the text in. With dissolve_from, the first frames blend from that clip's last frame."""
    W, H = P['size']; s = P['safe']; bg = tuple(sh.get('bg', [212, 20, 48])); n = int(round(dur * fps))
    final = os.path.join(d0, 'final.png'); card_cover(P, sh, final); fin = Image.open(final).convert('RGB')
    nt = Image.new('RGB', (W, H), bg); cx = (s['l'] + W - s['r']) // 2; cw = sh.get('cover_w', 780)
    z = sh['zoom_from']; w0, x0, y0 = z.get('w', W), z.get('x', 0), z.get('y', (H - W) // 2)
    x1, y1 = cx - cw // 2, s['t'] + sh.get('cover_top', 40); tz = z.get('t', 0.9)
    cov = Image.open(P['cover']).convert('RGB')
    last = None
    if sh.get('dissolve_from'):
        lf = os.path.join(d0, 'last.png')
        run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.05', '-i', sh['dissolve_from'], '-frames:v', '1', '-vf', f'scale={W}:{H}', lf])
        last = Image.open(lf).convert('RGB')
    for i in range(n):
        t = i / fps; k = min(t / tz, 1.0); e = k * k * (3 - 2 * k)
        w = int(round(w0 + (cw - w0) * e)); x = int(round(x0 + (x1 - x0) * e)); y = int(round(y0 + (y1 - y0) * e))
        fr = nt.copy(); fr.paste(cov.resize((w, w), Image.LANCZOS), (x, y))
        a = min(max((t - tz - 0.1) / 0.45, 0), 1)
        if a > 0 and k >= 1:
            fr = Image.blend(fr, fin, a)
        if last is not None and t < sh.get('dissolve', 0.3):
            fr = Image.blend(last, fr, t / sh.get('dissolve', 0.3))
        fr.save(os.path.join(d0, f'{i:04d}.png'))
    return n


def bar_png(P, title, artist, path):
    """Lower-third title bar: black plate with the song in white, a yellow tag with the artist."""
    W, H = P['size']; s = P['safe']; im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    ft = font(P['fonts']['bold'], 64); fa = font(P['fonts']['bold'], 40); x = s['l']; maxw = W - s['l'] - s['r']
    while d.textlength(title, font=ft) > maxw - 48 and ft.size > 36:
        ft = font(P['fonts']['bold'], ft.size - 4)
    y = H - s['b'] - 300
    tw = d.textlength(title, font=ft); aw = d.textlength(artist, font=fa)
    d.rectangle((x + 10, y + 10, x + tw + 48 + 10, y + 96 + 10), fill=(0, 0, 0, 120))
    d.rectangle((x, y, x + tw + 48, y + 96), fill=INK + (255,)); d.text((x + 24, y + 12), title, font=ft, fill=WHITE)
    d.rectangle((x, y + 96, x + aw + 40, y + 96 + 62), fill=YEL + (255,)); d.text((x + 20, y + 104), artist, font=fa, fill=INK)
    im.save(path)


def ai_png(P, path):
    W, H = P['size']; s = P['safe']; im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = font(P['fonts']['bold'], 28); tw = d.textlength(P['ai_line'], font=f); cx = (s['l'] + W - s['r']) / 2
    # Sits on the bottom edge of the safe zone (Sean 2026-11-22: v8 sat on the end-card button); ai_lift raises it.
    y = H - s['b'] - 46 - P.get('ai_lift', 0)
    d.rounded_rectangle((cx - tw / 2 - 18, y, cx + tw / 2 + 18, y + 46), radius=10, fill=(30, 18, 40, 220))
    d.text((cx - tw / 2, y + 7), P['ai_line'], font=f, fill=WHITE)
    im.save(path)


def vhs_png(P, path):
    W, H = P['size']; im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for y in range(0, H, 4):
        d.line([(0, y), (W, y)], fill=(0, 0, 0, 34), width=2)
    im.save(path)


def main(plan_path, out):
    P = json.load(open(plan_path)); W, H = P['size']; fps = P.get('fps', 30); T = P['duration']
    tmp = tempfile.mkdtemp(prefix='xmasad-'); segs = []
    for k, sh in enumerate(P['shots']):
        dur = sh['t1'] - sh['t0']; seg = os.path.join(tmp, f'seg{k:02d}.mp4')
        enc = ['-r', str(fps), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-an']
        if sh.get('card') == 'title':
            p = os.path.join(tmp, f'c{k}.png'); card_title(P, sh, p)
            run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-t', f'{dur}', '-i', p, '-vf',
                 f"zoompan=z='1+0.04*on/{int(dur*fps)}':d={int(dur*fps)}:s={W}x{H}:fps={fps}", '-t', f'{dur}'] + enc + [seg])
        elif sh.get('card') == 'logo':
            fd = os.path.join(tmp, f'logo{k}'); os.makedirs(fd); card_logo_frames(P, sh, fd, fps)
            run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(fd, '%04d.png'), '-t', f'{dur}'] + enc + [seg])
        elif sh.get('card') == 'still':
            p = os.path.join(tmp, f'c{k}.png'); Image.open(sh['image']).convert('RGB').resize((W, H), Image.LANCZOS).save(p)
            run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-t', f'{dur}', '-i', p, '-vf',
                 f"zoompan=z='1+0.05*on/{int(dur*fps)}':d={int(dur*fps)}:s={W}x{H}:fps={fps}", '-t', f'{dur}'] + enc + [seg])
        elif sh.get('card') == 'cover' and sh.get('zoom_from'):
            fd = os.path.join(tmp, f'cz{k}'); os.makedirs(fd); n = cover_zoom_frames(P, sh, fd, fps, dur)
            run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(fd, '%04d.png'), '-t', f'{dur}'] + enc + [seg])
        elif sh.get('card') == 'cover':
            p = os.path.join(tmp, f'c{k}.png'); card_cover(P, sh, p)
            src = ['-loop', '1', '-t', f'{dur}', '-i', p]
            if sh.get('dissolve_from'):
                lf = os.path.join(tmp, f'lf{k}.png')
                run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.05', '-i', sh['dissolve_from'], '-frames:v', '1', '-vf', f'scale={W}:{H}', lf])
                d0 = sh.get('dissolve', 0.6)
                run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-t', f'{dur}', '-i', lf] + src + ['-filter_complex',
                     f'[0:v]fps={fps},format=yuv420p[a];[1:v]fps={fps},format=yuv420p[b];[a][b]xfade=transition=fade:duration={d0}:offset=0', '-t', f'{dur}'] + enc + [seg])
            else:
                run(['ffmpeg', '-v', 'error', '-y'] + src + ['-vf', f'fps={fps}', '-t', f'{dur}'] + enc + [seg])
        elif sh.get('card') == 'end':
            p = os.path.join(tmp, f'c{k}.png'); card_end(P, sh, p)
            run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-t', f'{dur}', '-i', p, '-vf',
                 f"zoompan=z='1.03-0.03*on/{int(dur*fps)}':d={int(dur*fps)}:s={W}x{H}:fps={fps}", '-t', f'{dur}'] + enc + [seg])
        elif sh.get('chain'):
            # several clips in one shot, joined by crossfades (Sean 2026-11-22: the cut into the photo felt jumpy)
            parts, ins = [], []
            for j, c in enumerate(sh['chain']):
                ins += ['-ss', f"{c.get('ss', 0)}", '-t', f"{c['dur']}", '-i', c['clip']]
                parts.append(f"[{j}:v]scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},fps={fps},format=yuv420p,setpts=PTS-STARTPTS[c{j}]")
            fc = ';'.join(parts); prev = 'c0'; acc = sh['chain'][0]['dur']
            for j, c in enumerate(sh['chain'][1:], 1):
                xd = c.get('xfade', 0.4); acc -= xd
                fc += f";[{prev}][c{j}]xfade=transition=fade:duration={xd}:offset={acc:.3f}[x{j}]"; prev = f'x{j}'; acc += c['dur']
            run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', fc, '-map', f'[{prev}]', '-t', f'{dur}'] + enc + [seg])
        else:
            sp = sh.get('speed', 1.0)   # >1 plays faster (Sean 2026-11-22: the dance was too slow for the song)
            vf = (f'setpts=PTS/{sp},' if sp != 1.0 else '') + f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},fps={fps}'
            inputs = ['-ss', f"{sh.get('ss', 0)}", '-i', sh['clip']]
            if sh.get('bar'):
                bp = os.path.join(tmp, f'bar{k}.png'); bar_png(P, sh['bar'][0], sh['bar'][1], bp)
                run(['ffmpeg', '-v', 'error', '-y'] + inputs + ['-i', bp, '-filter_complex', f'[0:v]{vf}[v];[v][1:v]overlay=0:0', '-t', f'{dur}'] + enc + [seg])
            else:
                run(['ffmpeg', '-v', 'error', '-y'] + inputs + ['-vf', vf, '-t', f'{dur}'] + enc + [seg])
        segs.append(seg)
    lst = os.path.join(tmp, 'list.txt'); open(lst, 'w').write(''.join(f"file '{s}'\n" for s in segs))
    body = os.path.join(tmp, 'body.mp4'); run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', body])
    # static bursts, AI line, VHS pass
    ai = os.path.join(tmp, 'ai.png'); ai_png(P, ai); vh = os.path.join(tmp, 'vhs.png'); vhs_png(P, vh)
    st = '+'.join(f'between(t,{t-0.06:.2f},{t+0.06:.2f})' for t in P.get('statics', [])) or '0'
    # light grain only: heavy per-frame noise made a 15 s teaser 127 MB (v1)
    if P.get('vhs', True):
        fc = (f"[0:v]noise=alls=4:allf=t,rgbashift=rh=-3:bh=3,eq=saturation=1.12:contrast=1.04[a];"
              f"color=c=gray:s={W}x{H}:r={fps},noise=alls=100:allf=t,format=yuv420p[st];"
              f"[a][st]overlay=enable='{st}'[b];[b][1:v]overlay=0:0[c];[c][2:v]overlay=0:0,vignette=PI/6[v]")
    else:   # clean look (Sean 2026-11-22: the VHS cards read cheap): AI line only
        fc = "[0:v]null[c];[c][2:v]overlay=0:0[v]"
    vid = os.path.join(tmp, 'vid.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-i', body, '-loop', '1', '-i', vh, '-loop', '1', '-i', ai, '-filter_complex', fc,
         '-map', '[v]', '-t', f'{T}', '-r', str(fps), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', vid])
    # audio
    ins, parts = [], []
    for i, a in enumerate(P['audio']):
        ins += (['-ss', f"{a['ss']}"] if 'ss' in a else []) + (['-t', f"{a['dur']}"] if 'dur' in a else []) + ['-i', a['src']]
        g = f"volume={a.get('gain_db', 0)}dB"
        for d0, d1, db in a.get('duck', []):
            g += f",volume=enable='between(t,{d0 - a['at']:.2f},{d1 - a['at']:.2f})':volume={db}dB"
        fo = a.get('fade_out')
        fades = 'afade=t=in:d=0.03' + (f",afade=t=out:st={a['dur'] - fo:.2f}:d={fo}" if fo and 'dur' in a else '')
        parts.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,{fades},{g},adelay={int(a['at']*1000)}|{int(a['at']*1000)}[a{i}]")
    n = len(P['audio']); sti = n
    stat = ''.join(f"anoisesrc=d=0.12:c=white:a=0.05,aresample=48000,aformat=channel_layouts=stereo,adelay={int((t-0.06)*1000)}|{int((t-0.06)*1000)}[s{j}];"
                   for j, t in enumerate(P.get('statics', [])))
    mix = ''.join(f'[a{i}]' for i in range(n)) + ''.join(f'[s{j}]' for j in range(len(P.get('statics', []))))
    tot = n + len(P.get('statics', []))
    fc = ';'.join(parts) + ';' + stat + f"{mix}amix=inputs={tot}:normalize=0:duration=longest,atrim=0:{T},loudnorm=I=-16:TP=-1.5:LRA=11[out]"
    aud = os.path.join(tmp, 'aud.m4a')
    run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', fc, '-map', '[out]', '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', aud])
    run(['ffmpeg', '-v', 'error', '-y', '-i', vid, '-i', aud, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', '-movflags', '+faststart', out])
    print('wrote', out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
