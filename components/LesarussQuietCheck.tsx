"use client";
// The quiet check (lib/lesarussClient): signed in at HQ, a first visit to
// geekfon.ai comes back signed in here with nothing to click. Waits for the
// browser's Supabase session to load before deciding, and never runs twice in
// one tab session. Renders nothing.
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { quietCheck } from "@/lib/lesarussClient";

export default function LesarussQuietCheck() {
  useEffect(() => {
    let done = false;
    // getSession waits for the client to finish restoring a stored session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (done) return;
      done = true;
      quietCheck(!!session?.user);
    }).catch(() => { /* leave the page alone */ });
    return () => { done = true; };
  }, []);
  return null;
}
