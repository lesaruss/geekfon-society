# Release-pack runbook

Every GeekFon release gets the same pack: the distribution kit, the YouTube kit,
social cut-downs from the MV, two LoLA teasers and the members' behind-the-scenes.
Canon: `knowledge_records` slug `canon-geekfon-release-pack`. Pilot: Shamanic Resin,
"Hasta La Vista Maybe" (2026-11-19).

This folder copies the Support-tour layout (`../support-tour/`): a runbook, the tools
beside it, and gates.

| File | What it is |
|---|---|
| `slots.json` | The slot list for **every** release: output path, spec, method, credits, gate. Add a slot here and every release shows it as missing until it is built. |
| `releases/<release>.json` | One per release. It holds the sources, cut times, scripts and open decisions only. It never adds or drops slots. |
| `design_kit.py` | The brand pieces for designed slots, in the end-card design language. |
| `build_pack.py` | `plan`, `build`, `check`, `proof` and `align`. Free work only (ffmpeg and Pillow). Anything that costs credits is printed as a next step behind its gate. |

## Rules

- Every release has a `song_release_briefs` row before anything is built. Copy the
  field values from the artist's existing briefs, then link it with
  `pulse_songs.release_brief_id`. The metadata sheet is read from that row, never typed.
- Lyrics and captions use the official `pulse_songs` text. A whisper transcript only
  supplies timings.
- Show Sean the slot list (`plan`) and the teaser scripts before any credits are spent.
  Ask him before a release goes over 100 credits (`credit_budget_ask_above`).
- Cut-downs that show the MV's ending reveal are marked `publish: mv-day`. Nothing
  posted before the MV is public shows the reveal.
- **Safe margins (Sean 2026-11-19).** Words, faces, logos and graphics stay inside each
  slot's `spec.safe` area. Only background may run to the edge.
  - Why: the same post is framed differently in each place it shows up. Sean's repost
    of the first GeekFon post zoomed in and cut off half the R in Roxanne's name tag and
    the end of "Now playing", while the original on the GeekFon page looked fine.
    Instagram's grid crops posts and Reels to 3:4, and Reels, TikTok and Stories put
    buttons and captions over the edges.
  - `pad` mode fits the source inside the safe area, and overlays are placed inside it.
  - `proof` draws the area in red, and nothing that matters may cross it.
  - The numbers live in `slots.json` under `safe_zones` and each slot's `spec.safe`.
- **Cover upscales:** the AI upscaler can redraw the art. On the pilot it changed Momo's
  expression and thinned the outlines. Compare at 100% against a Lanczos resize, and use
  Lanczos when the AI version drifts.

## Gates

| Gate | Who | What |
|---|---|---|
| D0 title | Sean | The title is spelled the same in the catalog, the brief and on the MV before metadata is built. |
| D1 cover | Sean | How the cover gets to 3000 px. |
| G1 script | Sean | He approves each LoLA teaser script before any audio (Support-tour G1). |
| G2 look | Logan, PROOF, then Sean | The teaser stills, as in Support-tour G2, plus a storyboard of each teaser. Sean sees both before any audio or clips are made. |
| PROOF | Logan | `check` must pass, then the eye check written in each slot's `gate` in `slots.json`. |
| G3 final | Sean | He sees the whole pack before anything is uploaded to DistroKid, YouTube or social. |

## Steps

1. **Brief row.** Insert the `song_release_briefs` row and link it (see Rules).
   Put its id in the release file.
2. **Release file.** Copy `releases/shamanic-resin-hasta-la-vista-maybe.json`.
   - Fill in sources, cut times (`t0`/`t1`, and `x` or `xs` for crops), member frames,
     YouTube copy and the end-screen window.
   - `xs` frames each shot on its own: `[[seconds from cut start, x 0..1], ...]`.
   - Put any question for Sean under `decisions`, with your recommendation.
3. **Sources.** Make a `src/` folder. Every file here is named in the release file's `sources`.
   - `song.json`: the `pulse_songs` row (`slug`, `title`, `lyrics_en`,
     `lyrics_original`, `lyrics_original_lang`, `duration_seconds`).
   - `brief.json`: the `song_release_briefs` row.
   - `mv.mp4`, `cover.png`, the earlier MV versions and the stills: public `geekfon-media` URLs.
   - `master.wav`: in the private `geekfon-masters` bucket. Download it through a signed
     URL. The service key never goes into chat or into this repo.
4. **Plan.** Run `python3 build_pack.py plan releases/<release>.json --out pack`.
   - Show Sean the slot list, the credit total, the open decisions and the teaser scripts.
   - Record his answers in the release file. A decision is open until its `status` is `approved`.
5. **Cover (D1).** Make both versions and compare them at 100%:
   - AI: import `cover.png` to Higgsfield (`media_import_url` from the public URL) and run
     `upscale_image` at 4k (2 credits). Save the result as `src/cover-upscaled.png`
     (`"method": "ai"`).
   - Lanczos: `"method": "lanczos"` scales the original. It's free and keeps the line art.
   - Ship the AI version only if faces, expressions and outline weight are unchanged.
     On the pilot they changed, so it shipped Lanczos.
6. **Caption timings.** Do this in the Higgsfield sandbox, which has faster-whisper.
   - Transcribe the MV audio with word timestamps into `segs.json`, a list of
     `{start, end, text, words: [{word, start, end}]}`.
   - Run `python3 build_pack.py align releases/<release>.json --src src --whisper segs.json`.
     It writes `src/timings.json`.
   - Listen to every line it marks weak and fix its times by hand.
   - The timings come from the MV, so `mv_audio_offset` stays 0. Set it only if the
     captions are timed from another file.
7. **Build.** Run `python3 build_pack.py build releases/<release>.json --src src --out pack`.
   - It makes every free slot that is not blocked and says why it skipped the rest.
   - `--only id,id` rebuilds just those slots.
8. **Designed art.** Copy `releases/shamanic-resin-hasta-la-vista-maybe.design.py` for
   the release. Social pieces (thumbnails, Reel covers, teaser frames) use `design_kit.py`'s
   **reel look**, the look of the GeekFon launch-week reels. Sean 2026-11-19: similar, not
   identical. The look:
   - a LIVE bar with the GeekFon Society lockup
   - a solid colour field with a halftone dot texture, a different colour for each beat
   - yellow highlighter captions in Bricolage Grotesque
   - the art in a white card with a thick black border
   - a black name plate with a yellow tag, and the "AI artists" line

   Unlike the launch reels, every one of these sits inside the safe area.
   - **Vertical pieces:** the safe area is a white rounded panel (`design_kit.panel`), so
     the colour field around it reads as a frame (Sean 2026-11-19). The panel is centred,
     with its content inset so it stays inside `spec.safe`.
   - **Horizontal pieces** (thumbnails) keep the full colour field.
   - Make three thumbnail options and check each at full size and at YouTube's 168x94 list size.
   - Make a Reel cover with the title and faces inside the 3:4 grid crop.
   - Anything that posts before MV day uses shots from before the reveal.
   - Sean picks. Copy the picks into `src/design/` (`yt-thumbnail.jpg`, `reel-cover.jpg`).
   - Never ship a raw frame as a thumbnail, and never let a platform choose a Reel cover
     (Sean 2026-11-19).
9. **Teaser look (before credits).** Render one LoLA still per teaser with nano_banana_pro 4k
   (about 4 credits each), using her locked references (`lola_identity_lock`) and the band
   art as style anchor. Run the GeekFon style gate and PROOF on each.
   - Build a storyboard for each teaser: LoLA's shot, frozen MV cut-aways, a closing card
     from the design kit, and the captions, all inside the safe area.
   - Cut-aways come from before the MV's reveal.
   - Sean approves the stills and the storyboards before any voice or clip is made.
10. **Teasers (credits).** Use the Support-tour pipeline (`../support-tour/README.md`),
   with these changes:
   - **Voice: Sean records it** (canon-guide-voices-sean-performs). Add the approved script to
     HQ `lib/voiceBooth.ts` as a set, one line per storyboard beat (pilot: `gfs-hasta-teasers`).
     HQ deploys from `main`, so the set needs Sean's OK to ship. Sean records each line in
     BrandDesk > Voices, and the booth turns his take into LoLA's voice. Use his keepers, not
     `tts`, unless Sean asks for text-to-speech.
   - **Clips:** render Wan clips only for the beats where LoLA is on camera
     (`on_camera_lines`), from the 3:4 start frame cropped to her card. The voice runs on
     under the cut-aways. That's about 15 s of Wan per release (about 37.5 credits), not two
     full 15 s clips.
   - Render the still and the clip at 9:16. Run `stitch.py ... --size 1080x1920`.
   - In `lipcheck.py`, pass `--crop` for the 9:16 frame.
   - The bed is this song's instrumental (`stems`, `two_stems_v1`), through `music_bed.sh`.
   - In `captions.py`, ignore `missing_stops` (a teaser has no tour). Read every caption
     against the script.
   - The shirt is still the artist's Printify Face Tee. If the artist has none, stop and
     ask Sean. Run G2 as usual.
   - Cost: Wan 2.7 about 2.5 credits a second, nano_banana_pro about 4 credits a still,
     plus Sync.so sync-3 at about $4 a minute.
   - Before using the song's vocal-removed stem as a bed, scan it for drop-outs where the
     original was a cappella (canon `score_bed_rule`).
   - Save the result as `pack/teaser/lola-teaser-N.mp4`.
10b. **Launch reel (replaces the two teasers, Sean 2026-11-19).** One reel in the launch-reel
   template (Reels 1-2: LIVE bar, halftone colour per beat, yellow captions, art in a card,
   radio NOW PLAYING, "Tune in. It's free." close, the Reel 2 v2 82% frame). Per release, change
   the starting colour, LoLA's outfit (the artist's tee), her new line, and the song.
   - Copy `releases/shamanic-resin-hasta-la-vista-maybe.reel3.py`. It holds `BEATS` (one
     renderer per beat: art in, 1080x1920 frame out) and `STILL`; run it as a CLI for the
     stills board Sean approves before any credits.
   - Art is drawn natively at 9:16 (nano_banana_pro 4k): LoLA x2, one member singing the chorus,
     the band, one member for the radio card. No horizontal MV frames. Put the full single cover
     on its own beat. A Wan start image over about 10 MB fails ("Input file is too large"):
     send a 1440x2560 JPEG, not the 4k PNG.
   - Wan 2.7 at 9:16 1080p: LoLA clips with her booth line as `audio_references`, then sync-3;
     the singing clips with the song's vocal stem cut to the beat as `audio_references`.
   - Assemble with `assemble_reel.py plan.json out.mp4`: every frame is drawn by the design
     module with the clip frame as the art, so captions and name plates stay on top. The plan's
     `sync` puts a song moment (the chorus) on a beat; the song runs under LoLA quietly
     (`music_curve`), comes up for the chorus, and hands over to the instrumental stem for the
     close so the vocal never fights her last line. Split beats on the vocal timings (Whisper on
     the vocal stem) so each caption is the line being sung. Pilot plan: release file `reel3.assembly`.
   - LoLA's intro is ONE take: chain her clips (clip 2 starts on clip 1's last frame) and keep the
     frames sync-3 trims (`cut_off` stops at the end of the line), then join them into one file; all her
     beats share one colour and one card (`beat(lines=2)`), so only the caption changes (Sean 2026-11-19).
   - PROOF: lip closures on every b/m/p, STT on the final mix (English lines + the sung
     lyrics), each caption against the sung line, the frames against the approved stills.
11. **Check (PROOF).** Run `python3 build_pack.py check releases/<release>.json --out pack`.
   - It checks size, length, audio, slide count, WAV format and clipping, and the caption count.
   - Then run `python3 build_pack.py proof releases/<release>.json --out pack`. It makes
     one sheet per slot in `pack/_proof/`, with up to 16 frames per video and the safe
     area drawn in red.
   - Look for words, faces or graphics crossing the red box, stray graphics at crop edges
     (MV name cards), subjects cut off, and wrong names on slides.
12. **Store.** Insert each file through `gfs_art_imports` to
    `artists/<artist>/release-pack/<release>/<slot out path>`.
    - The WAV stays in `geekfon-masters`.
    - Mark the `bts` slots members-only wherever they are surfaced.
13. **G3.** Sean reviews the pack.
14. **Ship.** Upload to DistroKid with the metadata sheet. Upload the MV with the YouTube sheet.
    - Schedule the social cuts by their `publish` window.
    - Update the brief: `cover_art_status`, `distrokid_status`, `distrokid_release_id`, `release_date`.
15. **Log.** Write a `stream_events` row tagged `release-pack` and the release slug,
    saying what shipped and what is still open.

## Adding a slot

Add it to `slots.json`:
- `id`, `group`, `name`, `out`, `method`, `spec`, `credits`, `gate`
- default `params`

Use an existing `method` if one fits (`cut`, `frame`, `carousel`, `announce`, `srt`, `lyrics`,
`copy`, `ladder`, `gallery`). Otherwise add a maker in `build_slot` and a check in
`check_slot`. Bump `version`, then update the canon record's slot list.

## Song snippets (the feed, Sean 2026-11-19)

Between releases the feed is filled with 30-second snippets of the catalogue, a different artist each day.
`snippet.py spec.json out.mp4` draws one in the launch-reel look: the GeekFon top bar, the station tag, the
song's cover with a slow push-in, NOW PLAYING, the English lyric of the line being sung, the progress bar,
then the close ("Tune in. It's free." geekfon.ai). Music only, no credits, about 40 s to render.

1. Pick the song and its best 30 seconds (usually the first chorus). Specs live in `snippets/<artist>-<song>.json`.
2. Line times: Whisper with word timestamps on the song in the Higgsfield sandbox; one English line per sung
   line from `pulse_songs.lyrics_en`.
3. Render, then PROOF: every caption against the sung line, no word alone on a line, nothing outside the safe area.
4. "Tune in. It's free." is true: the radio rotation plays every on-air song to everyone, and artist pages give
   non-members a 30-second preview (`/api/songs/<id>/preview`). `radio_tracks.is_free_preview` is a legacy flag
   the live site does not read; do not rely on it.
