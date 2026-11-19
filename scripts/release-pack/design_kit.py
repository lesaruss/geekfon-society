#!/usr/bin/env python3
"""GeekFon design kit for release-pack art: the brand pieces every designed slot
(thumbnails, Reel covers, teaser cards) is built from, in the end-card design
language Sean approved for the Hasta La Vista Maybe MV (2026-11-18): deep purple
gradient, GeekFon Society lockup, Montserrat ExtraBold, the five-colour rainbow
bar, orange title.

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
