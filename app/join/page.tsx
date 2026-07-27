"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteChrome from "@/components/SiteChrome";

// Added 2026-07-27: this route did not exist at all - it 404'd - despite the
// dashboard's Affiliate portal (app/dashboard/page.tsx) and the Pro program
// (app/pro/page.tsx) already telling every Pro/Promoter affiliate to share
// "geekfon.ai/join?ref=CODE" as their personal referral link. Every affiliate
// link shared before this fix pointed at a dead page.
//
// This page just captures the ref code client-side (localStorage, 90-day
// window matching a typical attribution window) and sends the visitor on to
// registration. The actual server-side claim (writing referred_by_ref_code
// onto the new member's gfs_members row) happens once, after they finish
// signing up and land on /dashboard - see app/api/referral/claim/route.ts
// and the effect in app/dashboard/layout.tsx that calls it.
const REF_STORAGE_KEY = "gfs_ref_code";
const REF_STORAGE_AT_KEY = "gfs_ref_code_at";

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      try {
        localStorage.setItem(REF_STORAGE_KEY, ref.trim().toUpperCase());
        localStorage.setItem(REF_STORAGE_AT_KEY, String(Date.now()));
      } catch {
        // localStorage unavailable (private browsing, etc.) - attribution
        // just won't be captured for this visit, nothing else breaks.
      }
    }
    const timer = setTimeout(() => {
      router.replace("/register");
    }, 900);
    return () => clearTimeout(timer);
  }, [searchParams, router]);

  return (
    <SiteChrome>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000", gap: 14 }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,.12)", borderTopColor: "#E91E8C", borderRadius: "50%", animation: "gfsJoinSpin .8s linear infinite" }} />
        <span style={{ color: "rgba(255,255,255,.5)", fontFamily: "Montserrat, sans-serif", fontSize: 13, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
          Taking you to GeekFon Society...
        </span>
      </div>
      <style>{`@keyframes gfsJoinSpin { to { transform: rotate(360deg); } }`}</style>
    </SiteChrome>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinPageInner />
    </Suspense>
  );
}
