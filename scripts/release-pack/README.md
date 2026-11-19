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
| `build_pack.py` | `plan`, `build`, `check` and `align`. Free work only (ffmpeg and Pillow). Anything that costs credits is printed as a next step behind its gate. |

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

## Gates

| Gate | Who | What |
|---|---|---|
| D0 title | Sean | The title is spelled the same in the catalog, the brief and on the MV before metadata is built. |
| D1 cover | Sean | How the cover gets to 3000 px. |
| G1 script | Sean | He approves each LoLA teaser script before any audio (Support-tour G1). |
| G2 look | Logan, PROOF | The teaser still, as in Support-tour G2. |
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
5. **Cover (D1).** For an AI upscale:
   - Upload `cover.png` to Higgsfield and quote `upscale_image` (4k).
   - Run it and save the result as `src/cover-upscaled.png`.
   - `build` scales it to exactly 3000 px.
   - With `"method": "lanczos"`, `build` scales the original instead, at no cost.
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
8. **Teasers (credits).** Use the Support-tour pipeline (`../support-tour/README.md`),
   with these changes:
   - The script is the one Sean approved in the release file (G1). Keep it to about
     15 s, so it is one voice part and one clip.
   - Render the still and the clip at 9:16. Run `stitch.py ... --size 1080x1920`.
   - In `lipcheck.py`, pass `--crop` for the 9:16 frame.
   - The bed is this song's instrumental (`stems`, `two_stems_v1`), through `music_bed.sh`.
   - In `captions.py`, ignore `missing_stops` (a teaser has no tour). Read every caption
     against the script.
   - The shirt is still the artist's Printify Face Tee. If the artist has none, stop and
     ask Sean. Run G2 as usual.
   - Cost: Wan 2.7 about 37.5 credits for 15 s at 9:16, nano_banana_pro about 4 credits.
     That makes about 41.5 credits a teaser, plus Sync.so sync-3 at about $4 a minute.
   - Save the result as `pack/teaser/lola-teaser-N.mp4`.
9. **Check (PROOF).** Run `python3 build_pack.py check releases/<release>.json --out pack`.
   - It checks size, length, audio, slide count, WAV format and clipping, and the caption count.
   - Then do each slot's eye check. Make a 1-frame-a-second contact sheet of every video:
     ```sh
     ffmpeg -i x.mp4 -vf "fps=1,scale=180:-1,tile=15x1" -frames:v 1 sheet.jpg
     ```
     Look for stray graphics at crop edges, subjects cut off, and wrong names on slides.
10. **Store.** Insert each file through `gfs_art_imports` to
    `artists/<artist>/release-pack/<release>/<slot out path>`.
    - The WAV stays in `geekfon-masters`.
    - Mark the `bts` slots members-only wherever they are surfaced.
11. **G3.** Sean reviews the pack.
12. **Ship.** Upload to DistroKid with the metadata sheet. Upload the MV with the YouTube sheet.
    - Schedule the social cuts by their `publish` window.
    - Update the brief: `cover_art_status`, `distrokid_status`, `distrokid_release_id`, `release_date`.
13. **Log.** Write a `stream_events` row tagged `release-pack` and the release slug,
    saying what shipped and what is still open.

## Adding a slot

Add it to `slots.json`:
- `id`, `group`, `name`, `out`, `method`, `spec`, `credits`, `gate`
- default `params`

Use an existing `method` if one fits (`cut`, `frame`, `carousel`, `announce`, `srt`, `lyrics`,
`copy`, `ladder`, `gallery`). Otherwise add a maker in `build_slot` and a check in
`check_slot`. Bump `version`, then update the canon record's slot list.
