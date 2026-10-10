#!/usr/bin/env bash
# Lay the artist's instrumental under LoLA's voice (Sean 2026-10-10). The song
# plays from the top, fades in and out, and ducks whenever she talks.
# usage: music_bed.sh video.mp4 instrumental.mp3 out.mp4 [volume=0.40]
set -euo pipefail
V="$1"; I="$2"; O="$3"; VOL="${4:-0.40}"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
FO=$(python3 -c "print(max(0, $D - 2.4))")
ffmpeg -v error -y -i "$V" -i "$I" -filter_complex \
"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[vo][key];\
[1:a]atrim=0:$D,asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,volume=$VOL,afade=t=in:st=0:d=0.8,afade=t=out:st=$FO:d=2.4[m];\
[m][key]sidechaincompress=threshold=0.02:ratio=5:attack=15:release=350:makeup=1[duck];\
[vo][duck]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -movflags +faststart "$O"
echo "$O"
