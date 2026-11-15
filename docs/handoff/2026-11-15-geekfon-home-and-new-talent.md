# GeekFon: home page cleanup and New Talent submissions (2026-11-15)

Playbook: `geekfon-radio` (brand `geekfon-society`). Phase 2 is "New Talent station and submissions" (Sean, 2026-11-11).

## Done and live on geekfon.ai (proven at 1440 and 390)

1. **Meet the artists** replaces the repeated Stations shelf on the home page (commit `81f0f4d`).
   Sean asked why stations showed twice; a panel found them three times (rail, top tiles, big cards) and Holiday Radio a fourth.
   Top tiles stay as the one station picker; the shelf is four artists in the Artists page card (now shared as `ArtistCard`
   in `components/radio2/ArtistsView.tsx`), Show all to `/roster`. Sean: "Show me how that looks mocked up before we push anything",
   then "push it".
2. **New Talent strip**: the Holiday shelf became "Coming to the dial" with New Talent as one full-width strip (commit `ae890e5`).
   Sean: "fix the New Talent shelf next", then "push it".

## Built, NOT live: New Talent submission page `/new-talent`

Commit `e15c699` on branch `claude/ecstatic-lovelace-x85qaa` (not on main). Sean: "build the artist submission page for New Talent".

- Page: `app/(site)/new-talent/page.tsx`, view `components/radio2/NewTalentView.tsx`, styles `components/radio2/ntCss.ts`
  (loaded in `RadioShell`). How it works (Free, You keep your rights, We listen to every song, When it plays), then four steps
  (You, Your music, About you, Send), `?step=` in the address, Next checks each step, up to 3 songs (audio upload or link).
- API: `app/api/new-talent/upload-url/route.ts` (signed upload URL, audio only, 50 MB) and `app/api/new-talent/route.ts`
  (re-checks every field, honeypot, writes the row).
- Database (applied live and read back): table `gfs_new_talent_submissions` (RLS on, no policies, service role only; checks that
  both rights boxes are true and 1 to 3 songs), private bucket `gfs-new-talent` (50 MB). Migration
  `supabase/migrations/20261115_new_talent_submissions.sql`.
- Wired in: home strip button "Send your music", the rail's New Talent links to the page, `/new-talent` in the sitemap,
  `onNewTalent` so the rail does not mark Artists.
- Proven locally at 1440 and 390: validation per step, `?step=` and browser Back, thank-you screen, no sideways scroll.
- **Not yet proven**: a real upload to storage and a real row (local has no service key; send was stubbed).
  Branch preview, READY: `https://geekfon-society-m2ns1eg5b-contact-2245s-projects.vercel.app/new-talent`
  (protected; open it with the Vercel connector's share link).

## Waiting on Sean (one decision)

**Lock the terms on the page** (they are his call; artists will hold us to them). Logan's recommendation, the default if he
does not override:
- Free to send, now and later (no pay-to-play, per the TalentVangelist panel).
- Artists keep all rights; they give GeekFon Society permission to play the songs on GeekFon Radio and show name, picture and
  lyrics; they can ask for a song to come down any time.
- No pay and no guaranteed airplay promised.
- Open gap: no public GeekFon email for takedown requests. Ask Sean which address, or leave it as "reply to us when we write".

## Next actions, in order

1. Real end-to-end test on the branch preview: a [TEST] submission with a short audio file and a link song; confirm the row in
   `gfs_new_talent_submissions` and the file in `gfs-new-talent`; then delete both.
2. Sean locks the terms (or edits them).
3. Merge the branch to main, wait for the deploy, prove `/new-talent` live at 1440 and 390 beside the home page.
4. Later: a review view for submissions (BrandDesk or HQ), the confirmation email, and the New Talent station itself
   (opens at 3 artists and about 45 minutes, per the station rule).
