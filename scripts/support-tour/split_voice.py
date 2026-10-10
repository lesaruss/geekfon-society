#!/usr/bin/env python3
"""Cut LoLA's voice track into parts of at most 15 s at natural pauses (the
video model takes 2 to 15 s per clip). Writes voice-p1.mp3 ... and cuts.json.

usage: split_voice.py voice.mp3 outdir [--max 14.9]
"""
import json, re, subprocess, sys, os

src, out = sys.argv[1], sys.argv[2]
mx = float(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 14.9
os.makedirs(out, exist_ok=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src],
                           capture_output=True, text=True).stdout)
log = subprocess.run(['ffmpeg', '-i', src, '-af', 'silencedetect=n=-38dB:d=0.25', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
mids = [round((s + e) / 2, 2) for s, e in zip(starts, ends)]

cuts, at = [], 0.0
while dur - at > mx:
    ok = [m for m in mids if at + 2 < m <= at + mx]
    if not ok:
        sys.exit(f'no pause between {at:.2f}s and {at + mx:.2f}s; rewrite the line or allow a longer clip')
    at = ok[-1]
    cuts.append(at)
bounds = [0.0] + cuts + [dur]
parts = []
for i in range(len(bounds) - 1):
    a, b = bounds[i], bounds[i + 1]
    p = os.path.join(out, f'voice-p{i + 1}.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', src, '-c:a', 'libmp3lame', '-b:a', '192k', p], check=True)
    parts.append({'file': p, 'start': a, 'end': b, 'length': round(b - a, 3), 'clip_seconds': min(15, max(2, int(-(-(b - a) // 1))))})
json.dump({'duration': dur, 'cuts': cuts, 'parts': parts}, open(os.path.join(out, 'cuts.json'), 'w'), indent=1)
print(json.dumps({'cuts': cuts, 'lengths': [p['length'] for p in parts]}))
