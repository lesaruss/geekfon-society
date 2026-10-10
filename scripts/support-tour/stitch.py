#!/usr/bin/env python3
"""Join the rendered clips in order and lay the master voice track under them,
so the audio has no seams. Each clip is held on its last frame if it came back
short and trimmed to its part length. Output: 960x1286, 24 fps, web-ready.

usage: stitch.py cuts.json voice.mp3 out.mp4 clip1.mp4 clip2.mp4 ...
"""
import json, subprocess, sys

cuts, voice, out, clips = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
parts = json.load(open(cuts))['parts']
if len(parts) != len(clips):
    sys.exit(f'{len(parts)} voice parts but {len(clips)} clips')
P = 'tpad=stop_mode=clone:stop_duration=2,scale=960:1286,setsar=1,fps=24'
chain, labels = [], []
for i, part in enumerate(parts):
    chain.append(f'[{i}:v]{P},trim=0:{part["length"]:.3f},setpts=PTS-STARTPTS[v{i}]')
    labels.append(f'[v{i}]')
chain.append(''.join(labels) + f'concat=n={len(clips)}:v=1:a=0,format=yuv420p[v]')
cmd = ['ffmpeg', '-v', 'error', '-y']
for c in clips:
    cmd += ['-i', c]
cmd += ['-i', voice, '-filter_complex', ';'.join(chain), '-map', '[v]', '-map', f'{len(clips)}:a',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]
subprocess.run(cmd, check=True)
print(out)
