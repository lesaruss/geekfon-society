# Support-tour video runbook

LoLA's Support-tour video is the talking guide on each artist's storefront
(geekfon.ai/[artist-slug]). Roxanne's went live on 2026-10-10. This is the exact
process, so every artist gets the same video. Canon:
`knowledge_records` slug `canon-geekfon-support-tour-video`.

Scripts in this folder run in the Higgsfield sandbox (it has ffmpeg, faster-whisper
and Playwright). Fetch them from the commit you are using:

```sh
B=https://raw.githubusercontent.com/lesaruss/geekfon-society/main/scripts/support-tour
for f in split_voice.py stitch.py captions.py lipcheck.py music_bed.sh; do curl -sfO $B/$f; done
```

## Inputs per artist

| Input | Where it comes from |
|---|---|
| Script, about 45 s | Logan drafts it in the Roxanne pattern (intro, the shirt, story, album, feed and wallpapers, group chat, radio and press, $11 offer, sign-off). Sean approves (Gate 1). |
| Shirt art | The artist's Face Tee front print from Printify (Humble Cabbage). LoLA wears it on a pink tee. |
| LoLA's voice | ElevenLabs voice `AEW6JTgnyoPaoB9zlK3S`, approved by Sean on 2026-10-10. |
| Song bed | The artist's title track, unless Sean picks another. Vocals are removed with el-media `stems`. |
| Look | `lola_identity_lock` in `canon-geekfon-character-sheets`. |

## Gates

1. **Script:** Sean approves the words before any audio is made.
2. **Look:** check the still yourself before any clips are rendered (PROOF):
   - Shirt art matches the Printify print.
   - Two bracelets on her right wrist, one on her left.
   - Pastel rainbow bead choker.
   - Matte band-art style, not glossy.
3. **Final:** Sean watches the finished file before the profile switch. `gfs_artists` is the live database, so the switch is the publish.

## Steps

1. **Voice.** Generate it with el-media `tts` (voice `AEW6JTgnyoPaoB9zlK3S`) into `geekfon-series/support-tour/<artist>/`.
   - Encode the script as base64 in SQL so its punctuation survives.
   - Download it to the sandbox as `voice.mp3`.
2. **Split.** Run `python3 split_voice.py voice.mp3 parts`.
   - This makes parts of 15 s or less, cut at real pauses and spread evenly.
   - It writes `parts/cuts.json`, with `clip_seconds` for each part.
3. **Still.** Render it with `nano_banana_pro`, 3:4.
   - Pass first: LoLA's identity refs from canon, the shirt art, and the band art as style anchor.
   - Downsize to about 1440 px JPEG before using it as a start frame.
   - Then Gate 2.
4. **Clips.** Render one `wan2_7` clip per part.
   - Settings: `start_image` = `end_image` = the still, 3:4, 1080p, duration = `clip_seconds`, audio = that part's mp3.
   - She faces the lens the whole time, with no props. One small action such as fixing her shirt on her shoulder is fine, midway through only.
   - If a preset is suggested instead, resubmit with `declined_preset_id`.
   - Cost: about 120 credits per video.
5. **Stitch.** Run `python3 stitch.py parts/cuts.json voice.mp3 stitched.mp4 c1.mp4 c2.mp4 ...`.
   - The master voice runs unbroken under the joined clips.
   - It warns about short clips, and fails if the length is off the voice.
6. **Lip sync.** Store `stitched.mp4` and `voice.mp3` (`gfs_art_imports`), then call the SQL helpers. The key never leaves the database.
   ```sql
   select gfs_lipsync_submit('<video url>', '<voice url>');   -- returns a request id
   select gfs_lipsync_result(<request id>);                   -- gives the job id
   select gfs_lipsync_check('<job id>');                      -- every ~60 s until COMPLETED
   select gfs_lipsync_result(<check request id>);             -- status, outputUrl
   ```
   - Cost: Sync.so sync-3, about $4 a minute.
   - The raw output is about 1 MB/s. Re-encode it:
     ```sh
     ffmpeg -i raw.mp4 -c:v libx264 -crf 22 -c:a aac -b:a 128k -movflags +faststart synced.mp4
     ```
7. **Lip check (PROOF).** Run `python3 lipcheck.py voice.mp3 sheet.jpg synced=synced.mp4` and look at the sheet.
   - Red-labelled frames should show closed lips, blue ones open.
   - Roxanne passed at about 18 of 24 closed.
   - If it fails, run one Seedance edit pass, then sync-3 again.
8. **Song bed.**
   - Split the title track with el-media `stems` (`two_stems_v1`) into `artists/geekfon-society/series/support-tour/<artist>/stems/<song>/`.
   - Run `bash music_bed.sh synced.mp4 instrumental.mp3 final.mp4`.
9. **Captions and stops.** Run `python3 captions.py voice.mp3 tv.json --fix "song title lowercase=Song Title"`.
   - Check that every stop was found (`missing_stops` is empty).
   - Read every caption against the script.
10. **Store.** Insert `final.mp4` and a poster frame through `gfs_art_imports` to `artists/lola/support-tour/lola-<artist>-support-tour-vN.mp4`.
11. **Gate 3.** Sean watches `final.mp4`.
12. **Go live.** Set `profile.tourVideo` on the artist's `gfs_artists` row to:
    ```
    {src, poster, captions, stops}
    ```
    `captions` and `stops` come from `tv.json`.
13. **Verify live.** Open geekfon.ai/<artist> with Playwright and check:
    - The video plays.
    - Captions show.
    - The tour moves through all seven stops.

    Log the result to `stream_events`.
