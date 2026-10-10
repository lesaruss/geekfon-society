#!/usr/bin/env python3
"""Lip-sync check (PROOF). Finds every m, b and p sound and every pause in the
voice track, where the lips must be closed, plus open-vowel words, and builds a
contact sheet of the mouth at those moments for each video, one row per video.
Score by eye: count the closed mouths in the red row labels, the open ones in blue.
Roxanne baseline 2026-10-10: Wan 2.7 alone about 4 of 12 closed, after sync-3 about 9 of 12.

usage: lipcheck.py voice.mp3 sheet.jpg label=video.mp4 [label=video.mp4 ...] [--crop x,y,w,h] [--n 12]
       crop is in 960-wide frame pixels; the default fits LoLA's standard talking pose.
"""
import subprocess, sys
import numpy as np
from PIL import Image, ImageDraw
from faster_whisper import WhisperModel

argv = sys.argv[1:]
crop = [400, 110, 200, 200]; n = 12
if '--crop' in argv:
    i = argv.index('--crop'); crop = [int(x) for x in argv[i + 1].split(',')]; del argv[i:i + 2]
if '--n' in argv:
    i = argv.index('--n'); n = int(argv[i + 1]); del argv[i:i + 2]
voice, out, vids = argv[0], argv[1], [a.split('=', 1) for a in argv[2:]]

segs, _ = WhisperModel('base', compute_type='int8').transcribe(voice, word_timestamps=True)
words = [w for s in segs for w in s.words]
closed, opened = [], []
for i, w in enumerate(words):
    t = ''.join(c for c in w.word.lower() if c.isalpha())
    if not t:
        continue
    if t[0] in 'bmp':
        closed.append((w.start + 0.03, t))
    elif t[-1] in 'bmp':
        closed.append((w.end - 0.04, t))
    elif len(t) >= 3 and any(v in t for v in 'ao'):
        opened.append(((w.start + w.end) / 2, t))
    if i + 1 < len(words) and words[i + 1].start - w.end > 0.5:
        closed.append(((w.end + words[i + 1].start) / 2, 'pause'))
pick = lambda xs, k: [xs[int(j)] for j in np.linspace(0, len(xs) - 1, min(k, len(xs)))] if xs else []
T = [(t, s, 'red') for t, s in pick(sorted(closed), n)] + [(t, s, 'blue') for t, s in pick(opened, n // 2)]

cw = 130; x, y, w, h = crop
rows = []
for lab, v in vids:
    row = Image.new('RGB', (cw * len(T) + 70, cw + 16), 'white'); d = ImageDraw.Draw(row); d.text((4, cw // 2), lab, fill='black')
    for k, (t, s, col) in enumerate(T):
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', v, '-frames:v', '1', '-vf', f'scale=960:-2,crop={w}:{h}:{x}:{y}',
                              '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
        if len(raw) == w * h * 3:
            row.paste(Image.fromarray(np.frombuffer(raw, np.uint8).reshape(h, w, 3)).resize((cw, cw)), (70 + k * cw, 0))
        d.text((72 + k * cw, cw + 2), f'{s} {t:.1f}', fill=col)
    rows.append(row)
sheet = Image.new('RGB', (rows[0].width, sum(r.height for r in rows)), 'white')
for k, r in enumerate(rows):
    sheet.paste(r, (0, k * r.height))
sheet.save(out, quality=85)
print(f'{out}: {sum(1 for _ in T if _[2]=="red")} should-be-closed (red), {sum(1 for _ in T if _[2]=="blue")} should-be-open (blue)')
