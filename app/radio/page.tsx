// /radio now redirects to the homepage: the new GeekFon is the website, radio first (Sean, 2026-11-12).
// Old links keep working, including ?station= and ?view=.
import { redirect } from "next/navigation";

export default async function RadioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
  const s = q.toString();
  redirect(s ? `/?${s}` : "/");
}
