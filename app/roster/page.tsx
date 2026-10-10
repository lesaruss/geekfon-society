// geekfon.ai/roster retired 2026-10-10 (Sean: "it does the same as the main
// page"). The homepage lines up every artist, so old roster links land there.
import { redirect } from "next/navigation";

export default function RosterPage() {
  redirect("/");
}
