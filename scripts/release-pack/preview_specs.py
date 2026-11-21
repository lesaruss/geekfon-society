#!/usr/bin/env python3
"""Build artist_preview.py specs from Whisper output (Sean 2026-11-21: fill the 80% of the feed with
30-35 s artist previews). For each song: line-level timings from Whisper word timestamps matched to the
official lyric lines (pulse_songs; the original-language text when the song is not sung in English, with
the English line of the same index as the caption), then the window: the run-in to the first chorus, so the
hook and the title land (Sean on Back in the Day: "they hear the chorus, the hook, and the tie into the name").

usage: preview_specs.py songs.json segdir artdir outdir
  songs.json: [{artist, title, src, cover, dur, lang, en, orig}, ...] (pulse_songs rows)
  segdir:     seg-<i>.json from the sandbox Whisper pass ({lang, segs: [[start, end, text, [[t, word], ...]]], tsegs?})
Prints one line per song with the match quality; a low score means look at it by hand before it posts.
"""
import json, os, re, sys, unicodedata
from difflib import SequenceMatcher

# Hand-picked windows, with the reason. Ego Death: the chorus is "Kill the self ... I don't want to carry
# myself anymore"; as big on-screen captions that reads as self-harm to Instagram/TikTok moderation, so the
# preview runs verse 1 into the pre-chorus and stops as the chorus starts (Logan 2026-11-21).
WINDOW_OVERRIDES = {'Ego Death': (44.2, 72.1)}

CJK = re.compile(r'[぀-ヿ㐀-鿿가-힯]')


def parse(text):
    """[(section, line)] without the [Section] tags."""
    out, sec = [], ''
    for raw in (text or '').splitlines():
        s = raw.strip()
        if not s: continue
        m = re.match(r'^\[(.+?)\]$', s)
        if m: sec = m.group(1).lower(); continue
        out.append((sec, s))
    return out


def toks(s, cjk):
    s = unicodedata.normalize('NFKC', s).lower()
    if cjk: return [c for c in s if c.isalnum()]
    return re.findall(r"[a-z0-9äöüß']+", s)


def align_words(lines, words, cjk):
    """Greedy monotonic match of each lyric line onto the word stream. -> [(time or None, score)]"""
    stream = []   # (token, time)
    for t, w in words:
        for k in toks(w, cjk): stream.append((k, t))
    seq = [k for k, _ in stream]; p = 0; out = []
    for _, line in lines:
        L = toks(line, cjk); n = len(L)
        if not n: out.append((None, 0)); continue
        best, bs = 0, None
        for s in range(p, min(len(seq), p + max(60, 6 * n))):
            r = SequenceMatcher(None, L, seq[s:s + n]).ratio()
            if r > best: best, bs = r, s
        if bs is not None and best >= 0.5:
            out.append((stream[bs][1], best)); p = bs + max(1, int(n * 0.8))
        else:
            out.append((None, best))
    return out


def align_segs(lines, segs):
    """English lines onto Whisper's translated segments (songs sung in another language with no original text)."""
    p = 0; out = []
    for _, line in lines:
        L = toks(line, False); best, bj = 0, None
        for j in range(p, min(len(segs), p + 6)):
            r = SequenceMatcher(None, L, toks(segs[j][2], False)).ratio()
            if r > best: best, bj = r, j
        if bj is not None and best >= 0.35:
            out.append((segs[bj][0], best)); p = bj + 1
        else:
            out.append((None, best))
    return out


def interpolate(lines, times, max_gap=12.0):
    """A line Whisper missed, between two matched lines under max_gap seconds apart, gets a time in
    proportion to the text before it (rap verses: Whisper drops words, the anchors around them are solid)."""
    out = list(times); timed = [k for k, (t, _) in enumerate(times) if t is not None]
    for a, b in zip(timed, timed[1:]):
        if b - a < 2: continue
        ta, tb = times[a][0], times[b][0]
        if not (0 < tb - ta < max_gap): continue
        w = [max(1, len(lines[k][1])) for k in range(a, b)]; tot = sum(w); acc = 0
        for k in range(a + 1, b):
            acc += w[k - a - 1]; out[k] = (round(ta + (tb - ta) * acc / tot, 2), 0.0)
    return out


def window(lines, times, dur, length=30.0):
    timed = [(i, t) for i, (t, _) in enumerate(times) if t is not None]
    if not timed: return None
    ch = next((i for i, (sec, _) in enumerate(lines) if 'chorus' in sec and 'pre' not in sec and times[i][0] is not None), None)
    tc = times[ch][0] if ch is not None else timed[len(timed) // 3][1]
    lead = [t for _, t in timed if tc - 8.5 <= t <= tc]
    start = max(0.0, (min(lead) if lead else tc) - 0.35)
    end = min(start + length, dur - 4.0)
    if end - start < 20: return None
    return round(start, 2), round(end, 2)


def main(songs_path, segdir, artdir, outdir):
    songs = json.load(open(songs_path)); os.makedirs(outdir, exist_ok=True)
    report = []
    for i, s in enumerate(songs):
        segf = os.path.join(segdir, f'seg-{i}.json')
        if not os.path.exists(segf): report.append((i, s['title'], 'no whisper yet')); continue
        w = json.load(open(segf))
        en = parse(s['en']); orig = parse(s['orig']) if s.get('orig') else None
        if orig and len(orig) == len(en):
            src_lines, cjk = orig, bool(CJK.search(s['orig']))
            words = [tw for seg in w['segs'] for tw in seg[3]]
            times = align_words(src_lines, words, cjk)
        elif w['lang'] != 'en' and w.get('tsegs'):
            src_lines = en; times = align_segs(en, w['tsegs'])
        else:
            src_lines = en; times = align_words(en, [tw for seg in w['segs'] for tw in seg[3]], False)
        raw_times = times
        times = interpolate(src_lines, times)
        win = WINDOW_OVERRIDES.get(s['title']) or window(src_lines, times, s['dur'])
        # never open on the second half of a sentence: start a line earlier if the first caption is lowercase
        first = [k for k, (t, _) in enumerate(times) if t is not None and win[0] - 0.3 <= t] if win else []
        if first and en[first[0]][1][:1].islower() and s['title'] not in WINDOW_OVERRIDES:
            prev = [times[k][0] for k in range(first[0] - 1, max(-1, first[0] - 3), -1) if times[k][0] is not None]
            if prev and win[0] - prev[0] < 6: win = (round(prev[0] - 0.35, 2), round(min(prev[0] - 0.35 + 31.5, s['dur'] - 4.0), 2))
        if not win: report.append((i, s['title'], 'NO MATCH')); continue
        st, enn = win
        caps = [[round(t, 2), en[k][1]] for k, (t, _) in enumerate(times) if t is not None and st - 0.3 <= t < enn - 0.8]
        # lines in the window that found no time: the caption before them stays up, so count them
        idx = [k for k, (t, _) in enumerate(times) if t is not None and st - 0.3 <= t < enn - 0.8]
        span = range(idx[0], idx[-1] + 1) if idx else range(0)
        miss = sum(1 for k in span if times[k][0] is None)
        filled = sum(1 for k in idx if raw_times[k][0] is None)
        matched = [raw_times[k][1] for k in idx if raw_times[k][0] is not None]
        score = sum(matched) / max(1, len(matched))
        spec = {'artist': s['name'], 'title': s['title'], 'start': st, 'end': enn, 'song_seconds': s['dur'], 'lines': caps,
                'audio': f'audio/{i}.mp3', 'cover': f'covers/{i}.png', 'logo': 'logo.png', 'close_seconds': 3.6,
                'art': s['art'], 'color': s['color'], 'plate_tag': f"{s['title']} · {s['genre']}",
                'sources': {'audio': 'geekfon-radio-audio/' + s['src'], 'timings': f"faster-whisper small, matched to pulse_songs {'lyrics_original' if orig and len(orig) == len(en) else 'lyrics_en'}"}}
        slug = re.sub(r'[^a-z0-9]+', '-', f"{s['artist']}-{s['title']}".lower()).strip('-')
        json.dump(spec, open(os.path.join(outdir, f'{i:02d}-{slug}.json'), 'w'), ensure_ascii=False, indent=1)
        report.append((i, s['title'], f'{st}-{enn}s  captions {len(caps)}  filled {filled}  unmatched {miss}  match {score:.2f}'))
    for r in report: print(f'{r[0]:2d}  {r[1][:34]:34s}  {r[2]}')


if __name__ == '__main__':
    main(*sys.argv[1:5])
