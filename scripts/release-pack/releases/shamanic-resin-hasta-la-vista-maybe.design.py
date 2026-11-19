#!/usr/bin/env python3
"""Designed art for Shamanic Resin - Hasta La Vista Maybe: three YouTube thumbnail
options (A end-card family, B silhouettes, C big face) and the Reel cover, built
with design_kit.py. Sean picks one option per slot; the pick is copied into
--src design/ for build_pack.py.

usage: python3 releases/shamanic-resin-hasta-la-vista-maybe.design.py SRC OUT LOGO
       SRC holds stills/ (MV storyboard stills) and mv.mp4; OUT gets the options.
"""
import os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from design_kit import *

SRC, OUT, LOGO = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True); set_logo(LOGO)
S = os.path.join(SRC, 'stills') + '/'; O = OUT + '/'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '14.0', '-i', os.path.join(SRC, 'mv.mp4'), '-frames:v', '1', O + 'aoi.png'], check=True)
W,H=1280,720
# A: end-card family
band=Image.open(S+'ending-860-band-doorway-hardcel.png').convert('RGB')
a=grad(W,H,PURP,DEEP)
AH=560; k=AH/band.height; bw=round(band.width*k); bb=band.resize((bw,AH),Image.LANCZOS)
art=bb.crop((round(bw*0.10),0,round(bw*0.10)+880,AH))
mk=np.minimum(np.array(fade_mask(880,AH,740,880)).astype(float), (np.tile(np.clip(np.arange(AH)/90,0,1)[:,None],(1,880))*255))
a.paste(art,(0,H-AH),Image.fromarray(mk.astype('uint8')))
d=ImageDraw.Draw(a)
lockup(a,790,56,58)
text(d,(786,160),'SHAMANIC',F8(78)); text(d,(786,244),'RESIN',F8(78))
rainbow(d,790,345,seg=40)
text(d,(788,372),'Hasta La',F8(62),fill=ORANGE); text(d,(788,440),'Vista Maybe',F8(62),fill=ORANGE)
d.text((792,548),'THE DOOR IS OPEN',font=F6(24),fill=(225,215,240))
a.save(O+'yt-A-endcard.jpg',quality=92)

# B: silhouettes in the light, full bleed
sil=Image.open(S+'ending-812-silhouettes-near.png').convert('RGB')
b=cover(sil,W,H,0.55,0.35)
ov=Image.new('RGBA',(W,H)); od=ImageDraw.Draw(ov)
for y in range(H):
    t=max(0,(y-300)/420); top=max(0,(150-y)/150)
    od.line((0,y,W,y),fill=(20,0,40,int(max(235*min(1,t)**1.3, 200*top))))
b=Image.alpha_composite(b.convert('RGBA'),ov).convert('RGB'); d=ImageDraw.Draw(b)
lockup(b,48,40,56)
text(d,(48,470),'SHAMANIC RESIN',F8(92))
rainbow(d,52,575)
text(d,(48,600),'Hasta La Vista Maybe',F8(64),fill=ORANGE)
b.save(O+'yt-B-silhouettes.jpg',quality=92)

# C: big face, high contrast
aoi=Image.open(O+'aoi.png').convert('RGB')
c=grad(W,H,DEEP,PURP); face=cover(aoi,700,H,0.62,0.4)
fm=Image.fromarray((np.tile(np.clip(np.arange(700)/160,0,1),(H,1))*255).astype('uint8')); c.paste(face,(W-700,0),fm)
d=ImageDraw.Draw(c)
lockup(c,48,40,56)
text(d,(46,170),'HASTA',F8(150),fill=ORANGE); text(d,(46,320),'LA VISTA',F8(108)); text(d,(46,440),'MAYBE',F8(108))
rainbow(d,50,575)
text(d,(48,600),'SHAMANIC RESIN',F6(40))
c.save(O+'yt-C-face.jpg',quality=92)

# Reel cover 1080x1920 from A's system, key content inside the 3:4 grid crop (y 240-1680) and the side margins
rc=grad(1080,1920,PURP,DEEP,horizontal=False)
k=1340/band.width; bb=band.resize((1340,round(band.height*k)),Image.LANCZOS)
art=bb.crop((round(1340*0.06),0,round(1340*0.06)+1080,bb.height))
m=Image.fromarray((np.tile(np.clip((art.height-np.arange(art.height))/200,0,1)[:,None],(1,1080))*255).astype('uint8'))
rc.paste(art,(0,330),m)
d=ImageDraw.Draw(rc)
lockup(rc,300,1310,72)
text(d,(540,1440),'SHAMANIC RESIN',F8(96),anchor='ma')
rainbow(d,540-128,1555)
text(d,(540,1585),'Hasta La Vista Maybe',F8(66),fill=ORANGE,anchor='ma')
rc.save(O+'reel-cover-A.jpg',quality=92)

