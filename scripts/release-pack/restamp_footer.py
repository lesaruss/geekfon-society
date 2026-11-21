#!/usr/bin/env python3
"""Re-stamp the AI disclosure footer on a finished feed video without re-rendering it (Sean 2026-11-21: the
old line 'voices performed by the founder' read as if Sean sang the artists' parts). Works on every video
made in the Reel 2 v2 frame (snippet.py, artist_preview.py, the launch reels): the footer pill sits at
the same place in each, so a new, wider pill drawn there covers the old one on every frame.

usage: restamp_footer.py in.mp4 out.mp4 [song|voice]
"""
import os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from design_kit import *

W, H, S, TOP = 1080, 1920, 0.82, 190


def overlay_png(text, path):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = FIG(28); tw = d.textlength(text, font=f)
    d.rounded_rectangle((W - 40 - tw - 32, H - 78, W - 40, H - 26), radius=10, fill=(30, 18, 40, 255))
    d.text((W - 40 - tw - 16, H - 70), text, font=f, fill=WHITE)
    w, h = int(round(W * S / 2)) * 2, int(round(H * S / 2)) * 2
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.paste(im.resize((w, h), Image.LANCZOS), ((W - w) // 2, TOP)); out.save(path)


if __name__ == '__main__':
    src, dst = sys.argv[1:3]; kind = sys.argv[3] if len(sys.argv) > 3 else 'song'
    png = os.path.join(tempfile.mkdtemp(), 'footer.png'); overlay_png(AI_SONG if kind == 'song' else AI_VOICE, png)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-i', png, '-filter_complex', '[0:v][1:v]overlay=0:0', '-c:v', 'libx264',
                    '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', dst], check=True)
    print(dst)
