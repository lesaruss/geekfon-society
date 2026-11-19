#!/usr/bin/env python3
"""Assemble a LoLA teaser from its storyboard frames (design script output), the cleaned voice
lines (Sean's booth takes, trimmed), the Wan clips for the on-camera beats, and the song's
instrumental as a ducked bed.

Each beat holds its frame for the length of its line plus a short gap; when the beat has a clip,
the clip plays inside the frame's card (cards.json from the design script), with the card's
rounded corners. Cuts land on the words, like the launch reels.

usage: assemble_teaser.py plan.json out.mp4
plan.json:
  {"frames": "<dir with NAME-K.png and cards.json>", "name": "teaser-1",
   "bed": "instrumental.mp3", "bed_start": 43.0, "bed_volume": 0.30,
   "gap": 0.25, "tail": 1.0, "duck_ratio": 5, "duck_threshold": 0.02,
   "bed_eq": "equalizer=f=300:t=q:w=1:g=-5,equalizer=f=3000:t=q:w=1:g=-7,",   # optional dips that leave room for the voice
   "beats": [{"frame": 1, "audio": "t1-hi.wav", "video": "t1-hi.mp4"},
             {"frame": 2, "audio": "t1-change.wav"},
             {"frame": 5, "hold": 2.0}]}            # a beat with no line holds for "hold" seconds
"""
import json, os, subprocess, sys, tempfile

from PIL import Image, ImageDraw

W, H, FPS = 1080, 1920, 30


def seconds(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f],
                                capture_output=True, text=True, check=True).stdout)


def run(cmd):
    subprocess.run(cmd, check=True)


def main(plan_path, out):
    plan = json.load(open(plan_path)); base = os.path.dirname(os.path.abspath(plan_path))
    P = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
    frames = P(plan['frames']); cards = json.load(open(os.path.join(frames, 'cards.json')))
    gap, tail = plan.get('gap', 0.25), plan.get('tail', 1.0)
    tmp = tempfile.mkdtemp(prefix='teaser-')
    segs, voice_parts, starts, t = [], [], [], 0.0
    beats = plan['beats']
    for k, beat in enumerate(beats):
        key = f"{plan['name']}-{beat['frame']}"
        starts.append(t)
        still = os.path.join(frames, key + '.png')
        if beat.get('audio'):
            dur = seconds(P(beat['audio'])) + (tail if k == len(beats) - 1 else gap)
            voice_parts.append((t, P(beat['audio'])))
        else:
            dur = beat.get('hold', 2.0)
        seg = os.path.join(tmp, f'seg{k:02d}.mp4')
        if beat.get('video'):
            l, tp, r, b = cards[key][-1]; cw, ch = r - l, b - tp
            mask = os.path.join(tmp, f'mask{k}.png')
            m = Image.new('L', (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw - 1, ch - 1), radius=18, fill=255); m.save(mask)
            fc = (f'[1:v]fps={FPS},scale={cw}:{ch}:force_original_aspect_ratio=increase,crop={cw}:{ch},'
                  f'tpad=stop_mode=clone:stop_duration={dur:.2f},trim=0:{dur:.3f},setpts=PTS-STARTPTS,format=rgba[v];'
                  f'[2:v]format=gray[m];[v][m]alphamerge[vm];[0:v][vm]overlay={l}:{tp}:shortest=1,format=yuv420p[o]')
            run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', str(FPS), '-t', f'{dur:.3f}', '-i', still,
                 '-i', P(beat['video']), '-loop', '1', '-i', mask, '-filter_complex', fc, '-map', '[o]', '-t', f'{dur:.3f}',
                 '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-an', seg])
        else:
            run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', str(FPS), '-t', f'{dur:.3f}', '-i', still,
                 '-vf', f'scale={W}:{H},format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-r', str(FPS), '-an', seg])
        segs.append(seg); t += dur
    total = t
    lst = os.path.join(tmp, 'list.txt'); open(lst, 'w').write(''.join(f"file '{s}'\n" for s in segs))
    video = os.path.join(tmp, 'video.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', video])
    # voice: every line placed at its beat start; bed: the instrumental from bed_start, ducked under the voice
    inputs, delays = [], []
    for i, (st, a) in enumerate(voice_parts):
        inputs += ['-i', a]; delays.append(f'[{i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={int(st * 1000)}|{int(st * 1000)}[d{i}]')
    nv = len(voice_parts); bi = nv + 1
    bs, bv = plan.get('bed_start', 0.0), plan.get('bed_volume', 0.30)
    fc = ';'.join(delays) + ';' + ''.join(f'[d{i}]' for i in range(nv)) + f'amix=inputs={nv}:normalize=0:duration=longest,apad,atrim=0:{total:.3f}[vo];'
    fc += (f'[{bi}:a]atrim={bs}:{bs + total:.3f},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume={bv},'
           f'{plan.get('bed_eq', '')}afade=t=in:d=0.4,afade=t=out:st={max(0, total - 1.4):.3f}:d=1.4[bed];'
           f'[vo]asplit=2[v1][key];[bed][key]sidechaincompress=threshold={plan.get('duck_threshold', 0.02)}:ratio={plan.get('duck_ratio', 5)}:attack=15:release=350[duck];'
           f'[v1][duck]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[a]')
    run(['ffmpeg', '-v', 'error', '-y', '-i', video] + inputs + ['-i', P(plan['bed']), '-filter_complex', fc,
         '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', f'{total:.3f}',
         '-movflags', '+faststart', out])
    json.dump({'total': round(total, 2), 'starts': [round(s, 2) for s in starts]}, open(out + '.json', 'w'))
    print(out, f'{total:.2f} s')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
