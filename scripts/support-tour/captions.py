#!/usr/bin/env python3
"""Captions and tour-stop timings for profile.tourVideo, from the voice track.
Captions break at sentence ends, pauses and about 4.5 s. Each tour stop starts
0.3 s before the first word that names it, in tour order.

usage: captions.py voice.mp3 out.json [--fix "wrong=Right" ...]
       (LoLA's name is always fixed; add the album title, e.g. --fix "being you, being me=Being You, Being Me")
"""
import json, re, sys
from faster_whisper import WhisperModel

src, out = sys.argv[1], sys.argv[2]
fixes = {'lola': 'LoLA'}
args = sys.argv[3:]
for i, a in enumerate(args):
    if a == '--fix':
        k, v = args[i + 1].split('=', 1)
        fixes[k.lower()] = v
# The stops the Support tour has, in order (components/roster/Storefront.tsx), and the words that announce them.
STOPS = [('social', ['feed', 'posts']), ('gallery', ['wallpaper', 'wallpapers', 'gallery', 'art']),
         ('chat', ['group', 'chat']), ('radio', ['songs', 'station', 'radio']),
         ('press', ['story', 'stories', 'article', 'articles', 'press']), ('offer', ['$11', '11', 'eleven', 'dollars'])]

segs, _ = WhisperModel('base', compute_type='int8').transcribe(src, word_timestamps=True)
words = [w for s in segs for w in s.words]

# Break at sentence ends and real pauses; a chunk longer than 5.5 s splits at its
# most central comma, unless that comma sits inside a fixed phrase (an album title).
def chunk_text(ws):
    return ''.join(x.word for x in ws)

def protected(text, cut):
    low = text.lower()
    for k in fixes:
        for m in re.finditer(re.escape(k), low):
            if m.start() < cut < m.end():
                return True
    return False

raw, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    if not nxt or w.word.strip()[-1:] in '.!?' or nxt.start - w.end > 0.45:
        raw.append(cur); cur = []
final = []
for ch in raw:
    while ch[-1].end - ch[0].start > 5.5:
        text = chunk_text(ch); pos = 0; best = None
        for j, w in enumerate(ch[:-1]):
            pos += len(w.word)
            if w.word.strip().endswith(',') and not protected(text, pos):
                score = abs((w.end - ch[0].start) - (ch[-1].end - w.end))
                if best is None or score < best[0]:
                    best = (score, j)
        if best is None:
            break
        final.append(ch[:best[1] + 1]); ch = ch[best[1] + 1:]
    final.append(ch)

caps, prev_end = [], '.'
for k, ch in enumerate(final):
    t = chunk_text(ch).strip()
    for key, v in fixes.items():
        t = re.sub(re.escape(key), v, t, flags=re.I)
    if prev_end in '.!?' and t:
        t = t[0].upper() + t[1:]
    nxt = final[k + 1][0].start if k + 1 < len(final) else ch[-1].end + 0.3
    caps.append({'start': round(ch[0].start, 2), 'end': round(nxt, 2), 'text': t})
    prev_end = t[-1:] if t else '.'

stops, after = {'album': 0}, 0.0
for key, kws in STOPS:
    hit = next((w for w in words if w.start >= after and re.sub(r'[^\w$]', '', w.word.lower()) in kws), None)
    if hit:
        stops[key] = round(max(0, hit.start - 0.3), 2)
        after = hit.start
json.dump({'captions': caps, 'stops': stops}, open(out, 'w'), indent=1)
missing = [k for k, _ in STOPS if k not in stops]
print(json.dumps({'captions': len(caps), 'stops': stops, 'missing_stops': missing}))
