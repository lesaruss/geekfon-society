// Shared LESARs crediting logic. Both the Stripe webhook (web purchases) and
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
    description: `LESARs purchase: ${plan}`,
    reference_id: referenceId,
  });
}
