#!/usr/bin/env python3
"""Assemble a launch-template reel (Reels 1-3): every beat is drawn by the release's reel design
module, once per video frame, with the Wan clip frame as the art, so the clip sits in the card
under the captions and name plate exactly as on the approved stills. The design module's post()
(the Reel 2 v2 82% frame) is applied to every frame. Audio: the booth lines placed at their beats
and the song laid under the whole reel so a chosen song moment lands on a chosen beat, with a
volume curve (low under LoLA, up for the chorus), ducked under the voice, optionally handing over
to the instrumental stem for the close so the vocal never fights LoLA's last line.

usage: assemble_reel.py plan.json out.mp4
plan.json:
  {"design": "releases/<release>.reel3.py", "setup": ["<art dir>", "<logo.png>", "<cover.png>"],
   "music": "song.wav", "instrumental": "instrumental.mp3",      # instrumental optional
   "sync": {"beat": 3, "song": 11.26},     # song second 11.26 plays at the start of beat 3
   "music_curve": [[0, 0.22], [7.0, 0.22], [7.1, 0.7], ...],      # reel time, volume (linear)
   "instrumental_from": 25.2,              # reel time where the stem takes over (0.3 s crossfade)
   "duck_ratio": 8, "duck_threshold": 0.012, "fade_out": 1.4,
   "beats": [{"render": "psst", "dur": 0.80, "video": "hook.mp4", "video_start": 0.0},
             {"render": "question", "audio": "r3-rock.wav", "pad": 0.25, "video": "q.mp4"},
             {"render": "cover", "dur": 3.76},
             {"render": "close", "audio": "tune.wav", "pad": 1.2}]}
  A beat lasts "dur", or its line plus "pad". "voice_at" places a line inside a beat that has a dur
  (e.g. one take spoken across two beats). Clips shorter than the beat hold their last frame.
"""
import importlib.util, json, os, subprocess, sys, tempfile
from multiprocessing import Pool

import numpy as np
from PIL import Image

W, H, FPS = 1080, 1920, 30
_mod = None


def seconds(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f],
                                capture_output=True, text=True, check=True).stdout)


def load(design, setup):
    spec = importlib.util.spec_from_file_location('reel_design', design); m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m); m.setup(*setup); return m


def _init(design, setup):
    global _mod
    _mod = load(design, setup)


def _draw(job):
    name, art = job
    art = Image.fromarray(art) if art is not None else (_mod.A(_mod.STILL[name]) if name in _mod.STILL else None)
    im = _mod.BEATS[name](art)
    return np.asarray(_mod.post(im).convert('RGB')).tobytes()


def clip_frames(path, start, n):
    """n RGB frames from start at FPS; holds the last frame if the clip runs out."""
    probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                            '-of', 'csv=p=0', path], capture_output=True, text=True, check=True).stdout.split(',')
    w, h = int(probe[0]), int(probe[1])
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{start:.3f}', '-i', path, '-vf', f'fps={FPS}', '-frames:v', str(n),
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    fr = [np.frombuffer(raw[i:i + w * h * 3], np.uint8).reshape(h, w, 3) for i in range(0, len(raw), w * h * 3)]
    return fr + [fr[-1]] * (n - len(fr))


def curve(points):
    """Piecewise-linear volume expression for ffmpeg from [[t, v], ...]."""
    e = f'{points[-1][1]}'
    for (t0, v0), (t1, v1) in reversed(list(zip(points, points[1:]))):
        e = f'if(lt(t,{t1}),{v0}+({v1}-{v0})*(t-{t0})/{max(t1 - t0, 1e-3)},{e})'
    return f'if(lt(t,{points[0][0]}),{points[0][1]},{e})'


def main(plan_path, out):
    plan = json.load(open(plan_path)); base = os.path.dirname(os.path.abspath(plan_path))
    P = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
    here = os.path.dirname(os.path.abspath(__file__))
    design = plan['design'] if os.path.isabs(plan['design']) else os.path.join(here, plan['design'])
    setup = [P(a) for a in plan['setup']]
    tmp = tempfile.mkdtemp(prefix='reel-')
    t, starts, voice = 0.0, [], []
    for b in plan['beats']:
        starts.append(t)
        if b.get('audio'):
            b['_dur'] = b.get('dur') or seconds(P(b['audio'])) + b.get('pad', 0.25)
            voice.append((t + b.get('voice_at', 0.0), P(b['audio'])))
        else:
            b['_dur'] = b['dur']
        t += b['_dur']
    total = t
    # video: every frame drawn by the design module (parallel), piped to one encoder
    video = os.path.join(tmp, 'video.mp4')
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                            '-i', '-', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', video],
                           stdin=subprocess.PIPE)
    done = 0
    with Pool(max(1, os.cpu_count() - 1), initializer=_init, initargs=(design, setup)) as pool:
        for k, b in enumerate(plan['beats']):
            n = round((starts[k] + b['_dur']) * FPS) - done; done += n
            if b.get('video'):
                jobs = [(b['render'], f) for f in clip_frames(P(b['video']), b.get('video_start', 0.0), n)]
                for buf in pool.imap(_draw, jobs, chunksize=4):
                    enc.stdin.write(buf)
            else:
                buf = pool.apply(_draw, ((b['render'], None),))
                for _ in range(n):
                    enc.stdin.write(buf)
            print(f"  beat {k + 1} {b['render']}: {b['_dur']:.2f} s", flush=True)
    enc.stdin.close(); enc.wait()
    # audio
    ins, fc = [], []
    for i, (st, a) in enumerate(voice):
        ins += ['-i', a]; ms = int(st * 1000)
        fc.append(f'[{i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={ms}|{ms}[d{i}]')
    nv = len(voice); mi = nv + 1
    fc.append(''.join(f'[d{i}]' for i in range(nv)) + f'amix=inputs={nv}:normalize=0:duration=longest,apad,atrim=0:{total:.3f}[vo]')
    off = plan['sync']['song'] - starts[plan['sync']['beat']]   # song time at reel t=0
    ins += ['-i', P(plan['music'])]

    def song(idx, label):
        pre = f'adelay={int(-off * 1000)}|{int(-off * 1000)},' if off < 0 else ''
        trim = f'atrim={max(off, 0):.3f}:{max(off, 0) + total:.3f},' if off >= 0 else f'atrim=0:{total + off:.3f},'
        return f'[{idx}:a]{trim}asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,{pre}apad,atrim=0:{total:.3f}[{label}]'

    fc.append(song(mi, 'mix'))
    if plan.get('instrumental'):
        ins += ['-i', P(plan['instrumental'])]; fc.append(song(mi + 1, 'inst'))
        x = plan['instrumental_from']
        fc.append(f'[mix]afade=t=out:st={x:.3f}:d=0.3[m1];[inst]afade=t=in:st={x:.3f}:d=0.3[m2];'
                  f'[m1][m2]amix=inputs=2:normalize=0[song]')
    else:
        fc.append('[mix]anull[song]')
    fo = plan.get('fade_out', 1.4)
    fc.append(f"[song]volume='{curve(plan['music_curve'])}':eval=frame,afade=t=out:st={max(0, total - fo):.3f}:d={fo}[bed]")
    fc.append(f"[vo]asplit=2[v1][key];[bed][key]sidechaincompress=threshold={plan.get('duck_threshold', 0.012)}:"
              f"ratio={plan.get('duck_ratio', 8)}:attack=15:release=300[duck];"
              f"[v1][duck]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[a]")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video] + ins + ['-filter_complex', ';'.join(fc),
                    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-t', f'{total:.3f}', '-movflags', '+faststart', out], check=True)
    json.dump({'total': round(total, 2), 'starts': [round(s, 2) for s in starts], 'song_offset': round(off, 3)},
              open(out + '.json', 'w'))
    print(out, f'{total:.2f} s')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
