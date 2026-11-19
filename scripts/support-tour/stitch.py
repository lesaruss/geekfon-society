#!/usr/bin/env python3
"""Join the rendered clips in order and lay the master voice track under them,
so the audio has no seams. Each clip is held on its last frame if it came back
short (with a warning) and trimmed to its part length, and the result must
match the voice length. Output: 960x1286 (3:4) by default, 24 fps, web-ready.
--size WxH changes the frame, e.g. 1080x1920 for the 9:16 release-pack teasers.

usage: stitch.py cuts.json voice.mp3 out.mp4 clip1.mp4 clip2.mp4 ... [--size WxH]
"""
import json, subprocess, sys

argv = sys.argv[1:]
size = '960x1286'
if '--size' in argv:
    i = argv.index('--size'); size = argv[i + 1]; del argv[i:i + 2]
W, H = size.split('x')
cuts, voice, out, clips = argv[0], argv[1], argv[2], argv[3:]
parts = json.load(open(cuts))['parts']
if len(parts) != len(clips):
    sys.exit(f'{len(parts)} voice parts but {len(clips)} clips')
def seconds(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f],
                                capture_output=True, text=True, check=True).stdout)

chain, labels = [], []
for i, (part, clip) in enumerate(zip(parts, clips)):
    short = part['length'] - seconds(clip)
    if short > 0.5:
        print(f'warning: {clip} is {short:.1f} s shorter than part {i + 1}, holding its last frame', file=sys.stderr)
    hold = max(2, short + 1)
    chain.append(f'[{i}:v]tpad=stop_mode=clone:stop_duration={hold:.2f},scale={W}:{H},setsar=1,fps=24,'
                 f'trim=0:{part["length"]:.3f},setpts=PTS-STARTPTS[v{i}]')
    labels.append(f'[v{i}]')
chain.append(''.join(labels) + f'concat=n={len(clips)}:v=1:a=0,format=yuv420p[v]')
cmd = ['ffmpeg', '-v', 'error', '-y']
for c in clips:
    cmd += ['-i', c]
cmd += ['-i', voice, '-filter_complex', ';'.join(chain), '-map', '[v]', '-map', f'{len(clips)}:a',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]
subprocess.run(cmd, check=True)
gap = abs(seconds(out) - seconds(voice))
if gap > 0.1:
    sys.exit(f'{out} is {gap:.2f} s off the voice track')
print(out)
