// Shared Points crediting logic. Both the Stripe webhook (web purchases) and
// the RevenueCat webhook (native app purchases) call this so a top-up credits
// the same way no matter which store the user bought it from.
export async function creditLesars(
  supabase: any,
  userId: string,
  amount: number,
  plan: string,
  referenceId: string
) {
  const { data: existing } = await supabase
    .from("member_points")
    .select("available_points, total_points")
    .eq("user_id", userId)
    .maybeSingle();

  const newAvailable = (existing?.available_points || 0) + amount;
  const newTotal = (existing?.total_points || 0) + amount;

  await supabase.from("member_points").upsert(
    {
      user_id: userId,
      available_points: newAvailable,
      total_points: newTotal,
      locked_points: 0,
      spent_points: existing ? undefined : 0,
    },
    { onConflict: "user_id" }
  );

  await supabase.from("lesars_ledger").insert({
    user_id: userId,
    brand_slug: "geekfon",
    event_type: "purchase_lesars",
    amount,
    balance_after: newAvailable,
    description: `Points purchase: ${plan}`,
    reference_id: referenceId,
  });
}

// Added 2026-07-27 alongside the GeekFon Pro program (app/pro/page.tsx) and
// app/api/referral/claim/route.ts. Before this, the referrals table's
// total_earned_cents/pending_earned_cents columns existed and the dashboard
// Affiliate portal (app/dashboard/page.tsx) already rendered them, but
// nothing anywhere ever wrote to them - every affiliate's earnings always
// showed $0.00 regardless of purchases. Called from both the Stripe webhook
// (web) and the RevenueCat webhook (native) so a purchase credits the
// referrer's commission the same way no matter which store it came through.
//
// Uses the placeholder rates already defined in app/api/invite/route.ts /
// app/dashboard/context.tsx (promoter 10%, pro 25%) via the referral row's
// own commission_rate column - no new rate is invented here. Read-then-write
// rather than an atomic increment, which is fine at GeekFon's current
// purchase volume but would need an RPC/transaction if that changes.
export async function creditReferralCommission(
  supabase: any,
  purchasingUserId: string,
  amountCents: number
) {
  if (!amountCents || amountCents <= 0) return;

  const { data: member } = await supabase
    .from("gfs_members")
    .select("referred_by_ref_code")
    .eq("user_id", purchasingUserId)
    .maybeSingle();

  const refCode = member?.referred_by_ref_code;
  if (!refCode) return;

  const { data: referral } = await supabase
    .from("referrals")
    .select("referrer_id, commission_rate, window_expires_at, total_earned_cents, pending_earned_cents")
    .eq("ref_code", refCode)
    .maybeSingle();

  if (!referral || !referral.commission_rate) return;
  if (referral.window_expires_at && new Date(referral.window_expires_at).getTime() < Date.now()) return;
  if (referral.referrer_id === purchasingUserId) return; // guard against self-referral slipping through

  const creditCents = Math.round(amountCents * referral.commission_rate);
  if (creditCents <= 0) return;

  await supabase
    .from("referrals")
    .update({
      total_earned_cents: (referral.total_earned_cents || 0) + creditCents,
      pending_earned_cents: (referral.pending_earned_cents || 0) + creditCents,
    })
    .eq("referrer_id", referral.referrer_id);
}

// Added 2026-08-14 for the per-song LESARs unlock mechanic (111 LESARs per
// song, see app/api/tracks/unlock/route.ts). Thin wrapper around the
// existing Postgres debit_lesars() RPC, which was already fully implemented
// (balance check, lesars_ledger row, gfs_track_purchases insert, idempotent
// via the (user_id, artist_slug, track_name) unique constraint) but had zero
// callers anywhere in the app before this. Mirrors creditLesars() above -
// callers pass a plain supabase client, this does the RPC call and normalizes
// the jsonb result shape.
export async function debitLesars(
  supabase: any,
  userId: string,
  artistSlug: string,
  trackName: string,
  amount: number,
  trackUrl?: string | null
): Promise<{ ok: boolean; balance: number; alreadyOwned?: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("debit_lesars", {
    p_user_id: userId,
    p_artist_slug: artistSlug,
    p_track_name: trackName,
    p_amount: amount,
    p_track_url: trackUrl || null,
  });
  if (error) {
    return { ok: false, balance: 0, error: error.message || "debit_lesars failed" };
  }
  return {
    ok: !!data?.ok,
    balance: data?.balance ?? 0,
    alreadyOwned: !!data?.already_owned,
    error: data?.error,
  };
}
