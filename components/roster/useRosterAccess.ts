"use client";
// Asks the server what this viewer may have on an artist's roster (see
// app/api/roster/[artist]/access). The page renders the free view first;
// this upgrades it in place once the answer comes back. Nothing here is
// trusted for gating: the server only returns what the viewer is entitled to.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FanBibleModule } from "@/lib/server/bible";

export type SongGrant = {
  stream: string;
  download?: string;
  lyricsEn: string | null;
  lyricsOriginal: string | null;
  lyricsOriginalLang: string | null;
};

export type RosterAccess = {
  loaded: boolean;
  signedIn: boolean;
  supporter: boolean;
  allArtists: boolean;
  download: boolean;
  songs: Record<string, SongGrant>;
  downloads: Record<string, string>;
  bible?: FanBibleModule[];
};

const EMPTY: RosterAccess = { loaded: false, signedIn: false, supporter: false, allArtists: false, download: false, songs: {}, downloads: {} };

export function useRosterAccess(slug: string, enabled = true): RosterAccess & { refresh: () => void } {
  const [access, setAccess] = useState<RosterAccess>(EMPTY);

  const load = useCallback(async () => {
    if (!enabled || !slug) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/roster/${encodeURIComponent(slug)}/access`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        cache: "no-store",
      });
      if (!res.ok) { setAccess({ ...EMPTY, loaded: true }); return; }
      const body = await res.json();
      setAccess({
        loaded: true,
        signedIn: !!body.signedIn,
        supporter: !!body.supporter,
        allArtists: !!body.allArtists,
        download: !!body.download,
        songs: body.songs || {},
        downloads: body.downloads || {},
        bible: body.bible,
      });
    } catch {
      setAccess({ ...EMPTY, loaded: true });
    }
  }, [slug, enabled]);

  useEffect(() => {
    load();
    // Returning from a support checkout: the Stripe webhook may land a few
    // seconds after the redirect, so check again shortly after.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "success") {
      const t1 = setTimeout(load, 4000);
      const t2 = setTimeout(load, 12000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [load]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return { ...access, refresh: load };
}
