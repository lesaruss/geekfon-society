#!/usr/bin/env python3
"""GeekFon design kit for release-pack art.

Two looks:
- REEL LOOK (social: Reel covers, teasers, thumbnails). Sean 2026-11-19: social
  pieces follow the GeekFon launch-week reels (Reel 1 Roxanne, Reel 2 Straight &
  Narrow): a GeekFon LIVE bar, a solid colour field with a halftone dot texture,
  yellow highlighter captions in Bricolage Grotesque, the art in a white card with
  a thick black border and offset shadow, a black name plate with a yellow tag,
  and the "AI artists" line. Similar, not identical, and everything that matters
  sits inside the safe area (the launch reels put the bar, name plate and NOW
  PLAYING tag at the edges, which is what a repost clipped).
- END-CARD LOOK (the MV end card, 2026-11-18): deep purple gradient, lockup,
  Montserrat ExtraBold, rainbow bar, orange title. For YouTube end cards.

Fonts: Montserrat comes from public/fonts (variable woff2); kit_fonts() writes
static 800 and 600 TTFs next to this file the first time (needs fonttools, brotli).
Logo: vegan-media/media/brandkit/geekfon-society/logo-2026-11-01-dec10112.png,
passed as --logo or saved as logo.png in the working folder.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
PURP=(75,0,130); DEEP=(32,0,58); ORANGE=(246,152,32); WHITE=(255,255,255)
RAIN=[(250,214,40),(120,200,60),(40,180,230),(170,70,190),(246,152,32)]


def kit_fonts():
    out = {}
    for w in (800, 600):
        p = os.path.join(HERE, f'.montserrat-{w}.ttf')
        if not os.path.exists(p):
            from fontTools.ttLib import TTFont
            from fontTools.varLib.instancer import instantiateVariableFont
            f = TTFont(os.path.join(REPO, 'public/fonts/montserrat-JTUSjIg1_i6t8kCHKm459Wlhyw.woff2'))
            i = instantiateVariableFont(f, {'wght': w}); i.flavor = None; i.save(p)
        out[w] = p
    return out


_F = kit_fonts()


def _static(woff2, name, w, opsz=None):
    p = os.path.join(HERE, f'.{name}-{w}.ttf')
    if not os.path.exists(p):
        from fontTools.ttLib import TTFont
        from fontTools.varLib.instancer import instantiateVariableFont
        f = TTFont(os.path.join(REPO, 'public/fonts', woff2))
        loc = {a.axisTag: (w if a.axisTag == 'wght' else (a.maxValue if a.axisTag == 'opsz' else a.defaultValue)) for a in f['fvar'].axes}
        i = instantiateVariableFont(f, loc); i.flavor = None; i.save(p)
    return p


BRIC = lambda s: ImageFont.truetype(_static('bricolage-grotesque-latin.woff2', 'bricolage', 800), s)
FIG = lambda s: ImageFont.truetype(_static('figtree-latin.woff2', 'figtree', 700), s)
F8 = lambda s: ImageFont.truetype(_F[800], s)
F6 = lambda s: ImageFont.truetype(_F[600], s)
_logo = None


def set_logo(path):
    global _logo
    _logo = Image.open(path).convert('RGBA')

def cover(im, w, h, fx=0.5, fy=0.5):
    s=max(w/im.width,h/im.height); im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    l=round((im.width-w)*fx); t=round((im.height-h)*fy); return im.crop((l,t,l+w,t+h))

def grad(w,h,c1,c2,horizontal=True):
    a=np.linspace(0,1,w if horizontal else h)
    g=np.array(c1)[None,:]*(1-a[:,None])+np.array(c2)[None,:]*a[:,None]
    arr=np.tile(g[None,:,:],(h,1,1)) if horizontal else np.tile(g[:,None,:],(1,w,1))
    return Image.fromarray(arr.astype('uint8'))

def fade_mask(w,h,x0,x1):  # 255 left of x0, 0 right of x1
    a=np.clip((x1-np.arange(w))/(x1-x0),0,1); return Image.fromarray((np.tile(a,(h,1))*255).astype('uint8'))

def text(d,xy,s,f,fill=WHITE,shadow=True,anchor='la'):
    if shadow: d.text((xy[0]+3,xy[1]+4),s,font=f,fill=(10,0,25),anchor=anchor)
    d.text(xy,s,font=f,fill=fill,anchor=anchor)

def rainbow(d,x,y,seg=44,gap=8,h=8):
    for i,c in enumerate(RAIN): d.rounded_rectangle((x+i*(seg+gap),y,x+i*(seg+gap)+seg,y+h),4,fill=c)

def lockup(im,x,y,size):
    lg=_logo.resize((size,size),Image.LANCZOS); im.paste(lg,(x,y),lg)
    d=ImageDraw.Draw(im); text(d,(x+size+14,y+size*0.08),'GEEKFON',F8(int(size*0.5)),shadow=False)
    text(d,(x+size+18,y+size*0.62),'S O C I E T Y',F8(int(size*0.22)),fill=ORANGE,shadow=False)


# ---------- reel look ----------
REEL = {'yellow': (235, 225, 44), 'magenta': (153, 39, 141), 'orange': (244, 152, 28), 'green': (123, 193, 68),
        'pink': (226, 60, 140), 'blue': (60, 170, 230), 'red': (232, 48, 42)}
HILITE = (235, 225, 44); INK = (12, 12, 14)


def halftone(w, h, color, step=32, r=3):
    """Solid colour field with a faint darker dot grid, as on the launch reels."""
    im = Image.new('RGB', (w, h), color); d = ImageDraw.Draw(im)
    dot = tuple(max(0, int(c * 0.86)) for c in color)
    for y in range(step // 2, h, step):
        for x in range(step // 2, w, step):
            d.ellipse((x - r, y - r, x + r, y + r), fill=dot)
    return im


def live_bar(im, box, live=True):
    """Black rounded bar with the GeekFon Society lockup and a red LIVE dot, inside box (l, t, r, b)."""
    d = ImageDraw.Draw(im); l, t, r, b = box; h = b - t
    d.rounded_rectangle(box, radius=h // 4, fill=INK)
    size = int(h * 0.72); lg = _logo.resize((size, size), Image.LANCZOS); im.paste(lg, (l + h // 5, t + (h - size) // 2), lg)
    x = l + h // 5 + size + h // 7
    d.text((x, t + h * 0.12), 'GEEKFON', font=F8(int(h * 0.42)), fill=WHITE)
    d.text((x + 2, t + h * 0.58), 'S O C I E T Y', font=F8(int(h * 0.19)), fill=ORANGE)
    if live:
        f = F8(int(h * 0.30)); tw = d.textlength('LIVE', font=f)
        d.text((r - h // 4 - tw, t + h * 0.33), 'LIVE', font=f, fill=WHITE)
        cr = h * 0.09; cx = r - h // 4 - tw - cr * 2.6; cy = t + h * 0.52
        d.ellipse((cx - cr, cy - cr, cx + cr, cy + cr), fill=REEL['red'])


def wrap(d, s, f, maxw):
    lines, cur = [], ''
    for w in s.split():
        if cur and d.textlength(cur + ' ' + w, font=f) > maxw:
            lines.append(cur); cur = w
        else:
            cur = (cur + ' ' + w).strip()
    return lines + [cur]


def highlight(im, s, box, size, align='center'):
    """Yellow highlighter caption: one box per line, centred in box (l, t, r, b) from the top. Returns the bottom y."""
    d = ImageDraw.Draw(im); l, t, r, b = box; f = BRIC(size); pad = int(size * 0.22)
    y = t
    for line in wrap(d, s, f, r - l - 2 * pad):
        tw = d.textlength(line, font=f); x = l + (r - l - tw) / 2 if align == 'center' else l + pad
        d.rounded_rectangle((x - pad, y, x + tw + pad, y + size * 1.18), radius=int(size * 0.14), fill=HILITE)
        d.text((x, y + size * 0.04), line, font=f, fill=INK); y += size * 1.18
    return y


def card(im, art, box, fit='cover', fx=0.5, fy=0.5, border=10, shadow=16):
    """The art in a white card with a thick black border and an offset shadow, inside box."""
    d = ImageDraw.Draw(im); l, t, r, b = box = tuple(int(round(v)) for v in box)
    d.rounded_rectangle((l + shadow, t + shadow, r + shadow, b + shadow), radius=26, fill=INK)
    d.rounded_rectangle(box, radius=26, fill=INK)
    il, it, ir, ib = l + border, t + border, r - border, b - border
    a = cover(art, ir - il, ib - it, fx, fy) if fit == 'cover' else art.resize((ir - il, ib - it), Image.LANCZOS)
    m = Image.new('L', a.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, a.width - 1, a.height - 1), radius=18, fill=255)
    im.paste(a, (il, it), m)


def name_plate(im, name, tag, x, y, size=58):
    """Black name plate with a yellow tag under it, top-left at (x, y). Returns the right edge."""
    d = ImageDraw.Draw(im); f = F8(size); ft = FIG(int(size * 0.5)); pad = int(size * 0.3)
    tw = d.textlength(name, font=f)
    d.rectangle((x, y, x + tw + 2 * pad, y + size * 1.3), fill=INK); d.text((x + pad, y + size * 0.12), name, font=f, fill=WHITE)
    gw = d.textlength(tag, font=ft)
    d.rectangle((x, y + size * 1.3, x + gw + 2 * pad, y + size * 1.3 + size * 0.85), fill=HILITE)
    d.text((x + pad, y + size * 1.36), tag, font=ft, fill=INK)
    return x + max(tw, gw) + 2 * pad


def ai_line(im, cx, y, size=30):
    d = ImageDraw.Draw(im); f = FIG(size); s = 'AI artists · voices performed by the founder'; tw = d.textlength(s, font=f)
    d.rounded_rectangle((cx - tw / 2 - 18, y, cx + tw / 2 + 18, y + size * 1.6), radius=10, fill=(30, 18, 40))
    d.text((cx - tw / 2, y + size * 0.25), s, font=f, fill=WHITE)


def panel(im, box, radius=44, inset=28):
    """Vertical pieces (Sean 2026-11-19): the safe area is a white panel, so the
    colour field around it reads as a frame. Returns the inner content box."""
    ImageDraw.Draw(im).rounded_rectangle(box, radius=radius, fill=WHITE)
    l, t, r, b = box
    return l + inset, t + inset, r - inset, b - inset
