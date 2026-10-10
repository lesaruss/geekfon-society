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

def tidy(t):
    t = t.strip()
    for k, v in fixes.items():
        t = re.sub(re.escape(k), v, t, flags=re.I)
    return t[0].upper() + t[1:] if t else t

caps, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    end_sentence = w.word.strip()[-1:] in '.!?'
    gap = (nxt.start - w.end) if nxt else 9
    if end_sentence or gap > 0.35 or (w.end - cur[0].start) > 4.5 or not nxt:
        caps.append({'start': round(cur[0].start, 2), 'end': round(nxt.start if nxt else w.end + 0.3, 2),
                     'text': tidy(''.join(x.word for x in cur))})
        cur = []

stops, after = {'album': 0}, 0.0
for key, kws in STOPS:
    hit = next((w for w in words if w.start >= after and re.sub(r'[^\w$]', '', w.word.lower()) in kws), None)
    if hit:
        stops[key] = round(max(0, hit.start - 0.3), 2)
        after = hit.start
json.dump({'captions': caps, 'stops': stops}, open(out, 'w'), indent=1)
missing = [k for k, _ in STOPS if k not in stops]
print(json.dumps({'captions': len(caps), 'stops': stops, 'missing_stops': missing}))
