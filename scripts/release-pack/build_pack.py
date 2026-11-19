#!/usr/bin/env python3
"""GeekFon release pack: one slot list (slots.json) for every release, one
release file (releases/<release>.json) for the sources, times and decisions.

  plan   <release.json> [--out DIR]          every slot, its state, gate and credits; stops at open decisions
  build  <release.json> --src DIR --out DIR [--only id,id]   makes every free slot that is unblocked
  check  <release.json> --out DIR            PROOF on every built file against its spec
  proof  <release.json> --out DIR            eye-check sheets with each slot's safe area drawn in red
  align  <release.json> --src DIR --whisper segs.json        official lyric lines -> timings.json

--src holds the exported inputs (see README step 1): song.json (pulse_songs row),
brief.json (song_release_briefs row), mv.mp4, cover.png, master.wav, timings.json,
and anything a release lists under sources. Nothing here spends credits: slots
with a credit cost (teasers, an AI cover upscale) are printed as next steps for
the Support-tour pipeline or Higgsfield, behind their gates.
"""
import difflib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load(release_path):
    manifest = json.load(open(os.path.join(HERE, 'slots.json')))
    rel = json.load(open(release_path))
    slots = []
    for s in manifest['slots']:
        s = json.loads(json.dumps(s))
        s['params'] = {**s.get('params', {}), **rel.get('params', {}).get(s['id'], {})}
        slots.append(s)
    unknown = set(rel.get('params', {})) - {s['id'] for s in slots}
    if unknown:
        sys.exit(f'release file sets params for slots that are not in slots.json: {sorted(unknown)}')
    return manifest, rel, slots


def run(cmd):
    subprocess.run(cmd, check=True)


def probe(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                        'stream=codec_type,width,height,sample_rate,channels,bits_per_sample,bits_per_raw_sample,sample_fmt:format=duration,size',
                        '-of', 'json', f], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def seconds(f):
    return float(probe(f)['format']['duration'])


def ts(t):
    """'1:04.9' or 64.9 -> seconds"""
    if isinstance(t, (int, float)):
        return float(t)
    m, _, s = str(t).rpartition(':')
    return (int(m) * 60 if m else 0) + float(s)


def blocked(slot, rel):
    """Why a slot cannot be built yet, or None."""
    d = slot['params'].get('decision')
    if d and rel.get('decisions', {}).get(d, {}).get('status') != 'approved':
        return f'waiting on Sean: decision {d}'
    if slot['id'] == 'metadata' and rel.get('decisions', {}).get('title', {}).get('status') != 'approved':
        return 'waiting on Sean: decision title'
    if slot['method'] == 'teaser':
        if not slot['params'].get('script'):
            return 'no script yet'
        if not slot['params'].get('script_approved'):
            return 'G1: script not approved by Sean'
        return 'waiting on the voice: Sean records the HQ Voices set, then README step 10'
    if slot['method'] in ('cut', 'ladder') and (slot['params'].get('t0') is None or slot['params'].get('t1') is None):
        return 'no t0/t1 in the release file'
    if slot['method'] == 'frame' and slot['params'].get('t') is None:
        return 'no frame time in the release file'
    return None


def exists(out, slot):
    p = os.path.join(out, slot['out'])
    return os.path.isdir(p) and os.listdir(p) if p.endswith('/') else os.path.isfile(p)


# ---------- makers (all free: ffmpeg and Pillow) ----------

def x_expr(x, xs):
    """Crop position: one x for the whole cut, or xs = [[from_s, x], ...] keyed to
    seconds from the cut start, so each shot can be framed on its own subject."""
    if not xs:
        return str(x)
    xs = sorted(xs)
    e = str(xs[-1][1])
    for (t, v), (t_next, _) in reversed(list(zip(xs, xs[1:]))):
        e = f'if(lt(t,{t_next}),{v},{e})'
    return e


def safe_box(sp):
    """(left, top, right, bottom) of the area where words, faces and graphics must sit.
    Outside it, platforms crop (Instagram's 3:4 grid) or cover (buttons, captions)."""
    s = sp.get('safe', {})
    return s.get('l', 0), s.get('t', 0), sp['w'] - s.get('r', 0), sp['h'] - s.get('b', 0)


def vf_fit(w, h, fit, x=0.5, safe=None):
    if fit == 'pad':  # the whole source frame, inside the safe area, on a blurred copy of itself
        l, t, r, b = safe or (0, 0, w, h)
        fw, fh = r - l, b - t
        return (f'split[a][b];[a]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},boxblur=30:2,eq=brightness=-0.08[bg];'
                f'[b]scale={fw}:{fh}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay={l}+({fw}-w)/2:{t}+({fh}-h)/2,setsar=1')
    return f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}:'(iw-{w})*({x})':(ih-{h})/2,setsar=1"


def make_cut(slot, src, dst):
    p, sp = slot['params'], slot['spec']
    t0, t1 = ts(p['t0']), ts(p['t1'])
    d = t1 - t0
    vf = vf_fit(sp['w'], sp['h'], p.get('fit', 'crop'), x_expr(p.get('x', 0.5), p.get('xs')), safe_box(sp))
    cmd = ['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0:.3f}', '-t', f'{d:.3f}', '-i', src]
    lf = p.get('loop_fade')
    if lf:  # loop: cross-fade the tail into the head so the cut has no hard jump
        cmd += ['-filter_complex',
                f'[0:v]{vf},fps=24,split[m][h];[h]trim=0:{lf},setpts=PTS-STARTPTS[head];'
                f'[m]trim={lf},setpts=PTS-STARTPTS[body];[body][head]xfade=transition=fade:duration={lf}:offset={d - 2 * lf:.3f},format=yuv420p[v]',
                '-map', '[v]']
    else:
        cmd += ['-filter_complex', f'[0:v]{vf},fps=24,format=yuv420p[v]', '-map', '[v]']
    if sp.get('audio', True):
        cmd += ['-map', '0:a', '-af', f'afade=t=in:d=0.25,afade=t=out:st={d - 0.6:.3f}:d=0.6', '-c:a', 'aac', '-b:a', '192k']
    else:
        cmd += ['-an']
    cmd += ['-c:v', 'libx264', '-profile:v', 'high', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', dst]
    run(cmd)


def frame(src, t, path):
    run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{ts(t):.3f}', '-i', src, '-frames:v', '1', path])


def fit_image(im, w, h, fit='crop', x=0.5, safe=None):
    from PIL import Image, ImageFilter
    if fit == 'pad':
        l, t, r, b = safe or (0, 0, w, h)
        bg = fit_image(im, w, h, 'crop').filter(ImageFilter.GaussianBlur(40))
        fg = im.copy(); fg.thumbnail((r - l, b - t), Image.LANCZOS)
        bg.paste(fg, (l + (r - l - fg.width) // 2, t + (b - t - fg.height) // 2))
        return bg
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    left = round((im.width - w) * x)
    top = (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def strip_tags(text):
    lines = [l for l in text.splitlines() if not re.fullmatch(r'\s*\[[^\]]*\]\s*', l)]
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip() + '\n'


def lyric_lines(song, lang):
    key = 'lyrics_en' if lang == 'en' else 'lyrics_original'
    return [l.strip() for l in strip_tags(song[key]).splitlines() if l.strip()]


def srt_time(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}'


def font(size, bold=True):
    from PIL import ImageFont
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
              '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def build_slot(slot, rel, src, out):
    from PIL import Image, ImageDraw
    p, sp = slot['params'], slot.get('spec', {})
    dst = os.path.join(out, slot['out'])
    os.makedirs(os.path.dirname(dst) if not dst.endswith('/') else dst, exist_ok=True)
    song = json.load(open(os.path.join(src, 'song.json'))) if os.path.exists(os.path.join(src, 'song.json')) else None
    brief = json.load(open(os.path.join(src, 'brief.json'))) if os.path.exists(os.path.join(src, 'brief.json')) else None
    mv = os.path.join(src, 'mv.mp4')
    title = rel['title']
    m = slot['method']

    if m == 'cover':
        up = os.path.join(src, 'cover-upscaled.png')
        how = rel['decisions']['cover_upscale'].get('method', 'ai')
        if how == 'ai' and not os.path.exists(up):
            return 'needs src/cover-upscaled.png from the Higgsfield upscale (README step 4)'
        im = Image.open(up if how == 'ai' else os.path.join(src, 'cover.png')).convert('RGB')
        im = im.resize((sp['w'], sp['h']), Image.LANCZOS)
        im.save(dst, quality=95, subsampling=0)
    elif m == 'master':
        shutil.copyfile(os.path.join(src, 'master.wav'), dst)
    elif m == 'copy':
        shutil.copyfile(os.path.join(src, f"{p['source']}.mp4"), dst)
    elif m == 'lyrics':
        open(dst, 'w').write(strip_tags(song['lyrics_en' if p['lang'] == 'en' else 'lyrics_original']))
    elif m == 'metadata':
        fields = ['artist_name', 'track_name', 'album_title', 'track_number', 'release_date', 'producer', 'songwriter_name',
                  'songwriter_pro', 'songwriter_ipi', 'label_name', 'copyright_line', 'ai_vocals', 'ai_lyrics',
                  'ai_production', 'ai_tool_used', 'ai_disclosure_notes']
        rows = '\n'.join(f'| {f} | {str(brief.get(f) if brief.get(f) is not None else "(not set)").replace(chr(10), " ")} |' for f in fields)
        lang = {'ko': 'Korean'}.get(song.get('lyrics_original_lang'), song.get('lyrics_original_lang'))
        open(dst, 'w').write(f"# {brief['artist_name']}: {brief['track_name']}\n\nRead from song_release_briefs `{brief['id']}`. "
                             f"Do not type a field in DistroKid that is not in this table.\n\n| Field | Value |\n|---|---|\n{rows}\n"
                             f"| language | {lang} |\n| explicit | No |\n| duration | {song.get('duration_seconds')} s |\n")
    elif m == 'cut':
        make_cut(slot, mv, dst)
    elif m == 'frame':
        tmp = dst + '.png'; frame(mv, p['t'], tmp)
        im = fit_image(Image.open(tmp).convert('RGB'), sp['w'], sp['h']); os.remove(tmp)
        q = 92
        while True:
            im.save(dst, quality=q)
            if os.path.getsize(dst) < sp.get('max_mb', 99) * 1e6 or q < 60:
                break
            q -= 6
    elif m == 'srt':
        tim = json.load(open(os.path.join(src, 'timings.json')))
        lines = lyric_lines(song, p['lang'])
        if len(lines) != len(tim['lines']):
            return f"timings.json has {len(tim['lines'])} lines, the official lyrics have {len(lines)}"
        off = rel.get('mv_audio_offset', 0.0)
        with open(dst, 'w') as f:
            for i, (line, (a, b)) in enumerate(zip(lines, tim['lines']), 1):
                f.write(f'{i}\n{srt_time(a + off)} --> {srt_time(b + off)}\n{line}\n\n')
    elif m == 'upload_sheet':
        y = rel['youtube']
        tags = ', '.join(y.get('tags', []))
        ai = brief.get('ai_disclosure_notes', '').split('\n')[0]
        es = y['end_screen']
        open(dst, 'w').write(f"""# YouTube upload sheet: {brief['artist_name']} - {title}

## Title
{y['title']}

## Description
{y['description'].strip()}

How it was made: {ai}

## Tags
{tags}

## Settings
- Category: Music
- Made for kids: No
- Altered or synthetic content: {y['altered_content']}
- Captions: upload captions-en.srt (English) and captions-ko.srt (Korean)
- Thumbnail: thumbnail.jpg
- Visibility: {y.get('visibility', 'Private until the release date, then Public')}

## End screen
- Window: {es['from']} to {es['to']} (video ends {seconds(mv):.1f} s; YouTube allows the last 5-20 s)
- Elements: {'; '.join(es['elements'])}
- Placement: {es['placement']}
""")
    elif m == 'announce':
        cover = Image.open(os.path.join(src, 'cover.png')).convert('RGB')
        W, H = sp['w'], sp['h']
        canvas = fit_image(cover, W, H, 'crop')
        from PIL import ImageFilter
        canvas = canvas.filter(ImageFilter.GaussianBlur(50)).point(lambda v: int(v * 0.45))
        sl, st, sr, sb = safe_box(sp)
        side = min(sr - sl, sb - st - 290); art = cover.resize((side, side), Image.LANCZOS)
        canvas.paste(art, ((W - side) // 2, st))
        d = ImageDraw.Draw(canvas)
        y0 = st + side + 22
        for txt, y, size in [(p['line'].upper(), y0, 34), (rel['artist_name'].upper(), y0 + 46, 58), (title, y0 + 118, 48), (p['handle'], y0 + 228, 30)]:
            f = font(size, bold=size > 40)
            d.text(((W - d.textlength(txt, font=f)) / 2, y), txt, font=f, fill=(255, 255, 255))
        canvas.save(dst, quality=93)
    elif m == 'carousel':
        W, H = sp['w'], sp['h']
        cover = Image.open(os.path.join(src, 'cover.png')).convert('RGB')
        sl, st, sr, sb = safe_box(sp)
        fit_image(cover, W, H, 'pad', safe=(sl, st, sr, sb)).save(os.path.join(dst, '01-cover.jpg'), quality=93)
        for i, mem in enumerate(p['members'], 2):
            tmp = os.path.join(dst, '_f.png'); frame(mv, mem['t'], tmp)
            im = fit_image(Image.open(tmp).convert('RGB'), W, H, 'crop', mem.get('x', 0.5)); os.remove(tmp)
            d = ImageDraw.Draw(im); f = font(54)
            tw = d.textlength(mem['name'], font=f)
            d.rounded_rectangle(((W - tw) / 2 - 28, sb - 92, (W + tw) / 2 + 28, sb - 6), 20, fill=(0, 0, 0))
            d.text(((W - tw) / 2, sb - 82), mem['name'], font=f, fill=(255, 255, 255))
            if mem.get('role'):
                f2 = font(38); rw = d.textlength(mem['role'], font=f2)
                d.text(((W - rw) / 2, sb - 152), mem['role'], font=f2, fill=(255, 255, 255), stroke_width=4, stroke_fill=(0, 0, 0))
            im.save(os.path.join(dst, f'{i:02d}-{mem["slug"]}.jpg'), quality=93)
    elif m == 'ladder':
        vs = p['versions']; t0, t1 = ts(p['t0']), ts(p['t1'])
        cols = 3 if len(vs) > 4 else 2; rows = -(-len(vs) // cols)
        w, h = sp['w'] // cols, sp['h'] // rows
        cmd = ['ffmpeg', '-v', 'error', '-y']
        for v in vs:
            cmd += ['-ss', f'{t0:.3f}', '-t', f'{t1 - t0:.3f}', '-i', os.path.join(src, v['file'])]
        ff = font(10).path if hasattr(font(10), 'path') else ''
        chains, labels = [], []
        for i, v in enumerate(vs):
            chains.append(f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,fps=24,setsar=1,"
                          f"drawtext=fontfile={ff}:text='{v['label']}':x=14:y=12:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=8[p{i}]")
            labels.append(f'[p{i}]')
        layout = '|'.join(f'{(i % cols) * w}_{(i // cols) * h}' for i in range(len(vs)))
        chains.append(''.join(labels) + f"xstack=inputs={len(vs)}:layout={layout}:fill=black,scale={sp['w']}:{sp['h']},format=yuv420p[v]")
        run(cmd + ['-filter_complex', ';'.join(chains), '-map', '[v]', '-map', f'{len(vs) - 1}:a?', '-c:v', 'libx264', '-crf', '20',
                   '-c:a', 'aac', '-shortest', '-movflags', '+faststart', dst])
    elif m == 'design':  # a designed piece Sean picked, made with design_kit.py
        from PIL import Image
        im = Image.open(os.path.join(src, p['file'])).convert('RGB')
        if im.size != (sp['w'], sp['h']):
            return f"{p['file']} is {im.size[0]}x{im.size[1]}, want {sp['w']}x{sp['h']}"
        q = 92
        while True:
            im.save(dst, quality=q)
            if os.path.getsize(dst) < sp.get('max_mb', 99) * 1e6 or q < 60:
                break
            q -= 6
    elif m == 'gallery':
        for f in p['files']:
            shutil.copyfile(os.path.join(src, f), os.path.join(dst, os.path.basename(f)))
    else:
        return f'no maker for method {m}'
    return None


# ---------- PROOF checks ----------

def check_slot(slot, out):
    sp, p = slot.get('spec', {}), os.path.join(out, slot['out'])
    probs = []
    if slot['method'] in ('cut', 'copy', 'ladder', 'teaser'):
        info = probe(p); v = [s for s in info['streams'] if s['codec_type'] == 'video'][0]
        d = float(info['format']['duration'])
        if (v['width'], v['height']) != (sp['w'], sp['h']):
            probs.append(f"{v['width']}x{v['height']}, want {sp['w']}x{sp['h']}")
        if d < sp.get('min_s', 0) - 0.05 or d > sp.get('max_s', 1e9) + 0.05:
            probs.append(f'{d:.2f} s, want {sp.get("min_s", 0)}-{sp.get("max_s")} s')
        has_a = any(s['codec_type'] == 'audio' for s in info['streams'])
        if sp.get('audio', True) != has_a and slot['method'] != 'ladder':
            probs.append('audio present' if has_a else 'no audio')
    elif slot['method'] in ('cover', 'frame', 'announce', 'design'):
        from PIL import Image
        im = Image.open(p)
        if im.size != (sp['w'], sp['h']):
            probs.append(f'{im.size}, want {sp["w"]}x{sp["h"]}')
        if im.mode != 'RGB':
            probs.append(f'mode {im.mode}')
        if os.path.getsize(p) > sp.get('max_mb', 99) * 1e6:
            probs.append(f'{os.path.getsize(p) / 1e6:.1f} MB')
    elif slot['method'] == 'carousel':
        from PIL import Image
        files = sorted(f for f in os.listdir(p) if f.endswith('.jpg'))
        if not sp['min_slides'] <= len(files) <= sp['max_slides']:
            probs.append(f'{len(files)} slides')
        probs += [f'{f} {Image.open(os.path.join(p, f)).size}' for f in files if Image.open(os.path.join(p, f)).size != (sp['w'], sp['h'])]
    elif slot['method'] == 'master':
        info = probe(p); a = info['streams'][0]
        bits = int(a.get('bits_per_sample') or a.get('bits_per_raw_sample') or 0)
        if int(a['sample_rate']) < sp['min_rate']: probs.append(f"{a['sample_rate']} Hz")
        if a['channels'] != sp['channels']: probs.append(f"{a['channels']} channels")
        if bits not in sp['bits']: probs.append(f'{bits}-bit')
        r = subprocess.run(['ffmpeg', '-v', 'info', '-i', p, '-af', 'astats=measure_overall=Peak_level:measure_perchannel=none', '-f', 'null', '-'],
                           capture_output=True, text=True)
        peak = re.findall(r'Peak level dB:\s*(-?[\d.]+|-inf)', r.stderr)
        if peak and peak[-1] != '-inf' and float(peak[-1]) >= sp['max_peak_db']:
            probs.append(f'peak {peak[-1]} dBFS (clipped)')
        probs.append(f"info: {a['sample_rate']} Hz, {bits}-bit, {a['channels']} ch, {float(info['format']['duration']):.2f} s, peak {peak[-1] if peak else '?'} dBFS")
    elif slot['method'] == 'srt':
        n = len(re.findall(r'-->', open(p).read()))
        probs.append(f'info: {n} cues')
    return probs


def proof(slots, out, sheets):
    """Eye-check sheets: every video at 1 frame a second, every image, with the
    safe area drawn in red. Anything that matters (words, faces, graphics) must sit
    inside the red box."""
    from PIL import Image, ImageDraw
    os.makedirs(sheets, exist_ok=True)
    for s in slots:
        sp = s.get('spec', {})
        if 'safe' not in sp or not exists(out, s):
            continue
        p = os.path.join(out, s['out'])
        files = [os.path.join(p, f) for f in sorted(os.listdir(p)) if f.endswith('.jpg')] if p.endswith('/') else [p]
        frames = []
        for f in files:
            if f.endswith('.mp4'):
                d = seconds(f); n = max(1, min(16, int(d)))
                for i in range(n):
                    tmp = os.path.join(sheets, '_f.png'); frame(f, d * (i + 0.5) / n, tmp)
                    frames.append(Image.open(tmp).convert('RGB')); os.remove(tmp)
            else:
                frames.append(Image.open(f).convert('RGB'))
        l, t, r, b = safe_box(sp)
        th = 360; tw = round(sp['w'] * th / sp['h']); k = th / sp['h']
        cols = min(8, len(frames)); rows = -(-len(frames) // cols)
        sheet = Image.new('RGB', (cols * (tw + 6), rows * (th + 6)), 'black')
        for i, im in enumerate(frames):
            im = im.resize((tw, th)); d = ImageDraw.Draw(im)
            d.rectangle((l * k, t * k, r * k - 1, b * k - 1), outline=(255, 0, 0), width=2)
            sheet.paste(im, ((i % cols) * (tw + 6), (i // cols) * (th + 6)))
        dst = os.path.join(sheets, s['id'] + '.jpg'); sheet.save(dst, quality=88)
        print(dst)


# ---------- lyric alignment ----------

def align(rel, src, whisper):
    """Map each official line (original language) onto the whisper segment text in
    order. Whisper words are only used for TIMES; the words shown are always the
    official ones."""
    song = json.load(open(os.path.join(src, 'song.json')))
    lines = lyric_lines(song, 'original')
    words = [w for s in json.load(open(whisper)) for w in s.get('words', [])]
    norm = lambda s: re.sub(r'[\s\W_]+', '', s.lower())
    stream = ''.join(norm(w['word']) for w in words)
    idx = []  # char index -> word number
    for i, w in enumerate(words):
        idx += [i] * len(norm(w['word']))
    pos, out = 0, []
    for line in lines:
        target = norm(line)
        best, bscore = None, 0
        for start in range(pos, max(pos + 1, len(stream) - len(target) // 2)):
            sc = difflib.SequenceMatcher(None, target, stream[start:start + len(target)]).ratio()
            if sc > bscore:
                best, bscore = start, sc
            if start - pos > 4 * len(target) + 40:
                break
        if best is None:
            sys.exit(f'could not place line: {line}')
        end = min(best + len(target), len(stream)) - 1
        a, b = words[idx[best]]['start'], words[idx[end]]['end']
        out.append([round(a, 2), round(b, 2), round(bscore, 2), line])
        pos = end + 1
    for o in out:
        print(f'{o[0]:6.2f} {o[1]:6.2f}  match {o[2]:.2f}  {o[3]}')
    weak = [o for o in out if o[2] < 0.5]
    json.dump({'lines': [o[:2] for o in out], 'weak': [o[3] for o in weak]}, open(os.path.join(src, 'timings.json'), 'w'),
              ensure_ascii=False, indent=1)
    print(f"{os.path.join(src, 'timings.json')}: {len(out)} lines, {len(weak)} weak matches (fix these by ear before building captions)")


def main():
    a = sys.argv[1:]
    if len(a) < 2:
        sys.exit(__doc__)
    cmd, release = a[0], a[1]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    manifest, rel, slots = load(release)
    out, src = opt('--out'), opt('--src')
    only = set(opt('--only').split(',')) if opt('--only') else None

    if cmd == 'align':
        return align(rel, src, opt('--whisper'))

    open_decisions = {k: v for k, v in rel.get('decisions', {}).items() if v.get('status') != 'approved'}
    if cmd == 'plan':
        total = 0.0
        print(f"{rel['artist_name']} - {rel['title']}  ({len(slots)} slots, template v{manifest['version']})\n")
        for g, gname in manifest['groups'].items():
            print(gname)
            for s in [s for s in slots if s['group'] == g]:
                done = out and exists(out, s)
                why = blocked(s, rel)
                state = ('blocked: ' + why) if why and why.startswith('waiting on Sean') else ('BUILT' if done else ('blocked: ' + why if why else 'ready'))
                c = s['credits'] if isinstance(s['credits'], (int, float)) else 0
                total += 0 if done else c
                print(f"  {s['id']:<20} {state:<46} credits {s['credits'] if c else 0}")
            print()
        print(f'Credits still to spend: {total:.1f} (ask Sean above {manifest["credit_budget_ask_above"]})')
        for k, v in open_decisions.items():
            print(f"OPEN DECISION {k}: {v['question']}  Recommendation: {v.get('recommendation', '')}")
        return

    if cmd == 'build':
        made, skipped = [], []
        for s in slots:
            if only and s['id'] not in only:
                continue
            why = blocked(s, rel)
            if not why:
                try:
                    why = build_slot(s, rel, src, out)
                except FileNotFoundError as e:
                    why = f'missing source {os.path.basename(e.filename or "")} in --src (README step 1)'
            (skipped if why else made).append((s['id'], why))
        for i, _ in made:
            print(f'built   {i}')
        for i, w in skipped:
            print(f'skipped {i}: {w}')
        return

    if cmd == 'proof':
        return proof(slots, out, opt('--sheets', os.path.join(out, '_proof')))

    if cmd == 'check':
        bad = 0
        for s in slots:
            if not exists(out, s):
                print(f"MISSING {s['id']}"); bad += 1; continue
            probs = check_slot(s, out)
            fails = [x for x in probs if not x.startswith('info:')]
            bad += bool(fails)
            print(f"{'FAIL' if fails else 'ok  '}    {s['id']:<20} {'; '.join(probs)}")
        print(f'\n{bad} slot(s) missing or failing. Automatic checks only: the eye checks in each slot gate still apply.')
        sys.exit(1 if bad else 0)
    sys.exit(__doc__)


if __name__ == '__main__':
    main()
